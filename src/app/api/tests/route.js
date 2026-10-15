import { NextResponse } from 'next/server';
import { query, pool, LEARNER_ID } from '../../../lib/db.mjs';
import { difficultyBand } from '../../../domain/difficulty.mjs';
import { allocateSlots, pickTopicQuestions } from '../../../domain/testGen.mjs';

export const dynamic = 'force-dynamic';

const TARGET_LENGTH = 25;

/**
 * GET /api/tests
 *
 * Past tests, most recent first — the "Previous tests" list. No scoring or
 * generation logic here, just the rows POST /api/tests and submit already
 * produced.
 */
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, status, question_count, score::float8 AS score, started_at, completed_at
         FROM test WHERE learner_id = $1 ORDER BY created_at DESC`,
      [LEARNER_ID]
    );

    return NextResponse.json({
      items: rows.map((r) => ({
        testId: r.id,
        status: r.status,
        questionCount: r.question_count,
        score: r.score,
        startedAt: r.started_at,
        completedAt: r.completed_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'TESTS_LIST_FAILED', message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/tests
 *
 * Generates a weekly test: 25 questions allocated across the examined
 * topics (apt.aptitude's 10 + apt.reasoning's 6 — the same chapters
 * /api/plan/today draws exam weight from) proportional to each chapter's
 * real question count. Foundation topics (fractions, division, ...) are
 * prerequisite-only and never appear here, same as they never become the
 * plan's primary action.
 */
export async function POST() {
  try {
    const [{ rows: chapters }, { rows: withContent }, { rows: seenRows }] = await Promise.all([
      query(
        `SELECT c.id AS chapter_id, c.question_count, t.id AS topic_id, t.name AS topic_name
           FROM chapter c JOIN topic t ON t.chapter_id = c.id
          WHERE c.id IN ('apt.aptitude', 'apt.reasoning')`
      ),
      query(`SELECT DISTINCT topic_id, id, difficulty::float8 AS difficulty, prompt, options, estimated_seconds
               FROM question WHERE status = 'PUBLISHED'`),
      query(`SELECT DISTINCT question_id FROM question_attempt WHERE learner_id = $1`, [LEARNER_ID]),
    ]);

    const seenIds = new Set(seenRows.map((r) => r.question_id));

    const topicsByChapter = new Map();
    for (const row of chapters) {
      if (!topicsByChapter.has(row.chapter_id)) topicsByChapter.set(row.chapter_id, []);
      topicsByChapter.get(row.chapter_id).push(row);
    }

    const shares = [];
    const topicMeta = new Map();
    for (const [, topics] of topicsByChapter) {
      const share = topics[0].question_count / topics.length;
      for (const t of topics) {
        shares.push({ id: t.topic_id, share });
        topicMeta.set(t.topic_id, t.topic_name);
      }
    }

    const questionsByTopic = new Map();
    for (const q of withContent) {
      if (!topicMeta.has(q.topic_id)) continue; // outside apt.aptitude/apt.reasoning
      if (!questionsByTopic.has(q.topic_id)) questionsByTopic.set(q.topic_id, []);
      questionsByTopic.get(q.topic_id).push(q);
    }

    // Only allocate slots to topics that actually have content yet.
    const availableShares = shares.filter((s) => (questionsByTopic.get(s.id) ?? []).length > 0);
    const slots = allocateSlots(availableShares, TARGET_LENGTH);

    let picked = [];
    for (const [topicId, count] of slots) {
      if (count <= 0) continue;
      const topicQuestions = questionsByTopic.get(topicId) ?? [];
      picked.push(...pickTopicQuestions(topicQuestions, count, seenIds));
    }

    if (picked.length === 0) {
      return NextResponse.json(
        { code: 'NO_CONTENT', message: 'No examined topics have published questions yet' },
        { status: 404 }
      );
    }

    // Shuffle so the test isn't visibly grouped by topic — presentation
    // only, not a scoring decision, so plain randomness is fine here.
    for (let i = picked.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: testRows } = await client.query(
        `INSERT INTO test (learner_id, question_count) VALUES ($1, $2) RETURNING id`,
        [LEARNER_ID, picked.length]
      );
      const testId = testRows[0].id;

      for (const [index, q] of picked.entries()) {
        await client.query(
          `INSERT INTO test_question (test_id, question_id, order_index) VALUES ($1, $2, $3)`,
          [testId, q.id, index]
        );
      }
      await client.query('COMMIT');

      return NextResponse.json({
        testId,
        questions: picked.map((q) => ({
          questionId: q.id,
          topicId: q.topic_id,
          topicName: topicMeta.get(q.topic_id),
          prompt: q.prompt,
          options: q.options,
          difficulty: difficultyBand(q.difficulty),
          estimatedSeconds: q.estimated_seconds,
        })),
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return NextResponse.json({ code: 'TEST_CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
