import { NextResponse } from 'next/server';
import { query, pool } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';
import { difficultyBand } from '../../../domain/difficulty.mjs';
import { allocateSlots, pickTopicQuestions } from '../../../domain/testGen.mjs';

export const dynamic = 'force-dynamic';

const TARGET_LENGTH = 25;

/**
 * GET /api/tests
 * Returns the authenticated learner's persisted test history.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows } = await query(
      `SELECT id, status, question_count AS "questionCount", score,
              started_at AS "startedAt", completed_at AS "completedAt", created_at AS "createdAt"
         FROM test
        WHERE learner_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [learnerId]
    );
    return NextResponse.json({ tests: rows });
  } catch (err) {
    return NextResponse.json({ code: 'TEST_HISTORY_FAILED', message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/tests
 * body (optional): { templateId }
 *
 * Generates a weekly test. With no templateId: the original default --
 * 25 questions allocated across the examined topics (apt.aptitude's 10 +
 * apt.reasoning's 6 — the same chapters /api/plan/today draws exam weight
 * from) proportional to each chapter's real question count. Foundation
 * topics (fractions, division, ...) are prerequisite-only and never appear
 * here, same as they never become the plan's primary action.
 *
 * With a templateId (an admin-authored test_template, see /admin/tests):
 * the topic composition and per-topic question count come straight from
 * that template instead of the hardcoded default.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const templateId = body?.templateId ?? null;

  try {
    const [{ rows: withContent }, { rows: seenRows }] = await Promise.all([
      query(`SELECT DISTINCT topic_id, id, difficulty::float8 AS difficulty, prompt, options, estimated_seconds
               FROM question WHERE status = 'PUBLISHED'`),
      query(`SELECT DISTINCT question_id FROM question_attempt WHERE learner_id = $1`, [learnerId]),
    ]);

    const seenIds = new Set(seenRows.map((r) => r.question_id));
    const topicMeta = new Map();
    let slots;

    if (templateId) {
      const { rows: templateTopics } = await query(
        `SELECT ttt.topic_id, ttt.target_count, t.name AS topic_name
           FROM test_template_topic ttt JOIN topic t ON t.id = ttt.topic_id
          WHERE ttt.template_id = $1`,
        [templateId]
      );
      if (templateTopics.length === 0) {
        return NextResponse.json({ code: 'TEMPLATE_NOT_FOUND', message: `No test template ${templateId}` }, { status: 404 });
      }
      for (const t of templateTopics) topicMeta.set(t.topic_id, t.topic_name);
      slots = templateTopics.map((t) => [t.topic_id, t.target_count]);
    } else {
      const { rows: chapters } = await query(
        `SELECT c.id AS chapter_id, c.question_count, t.id AS topic_id, t.name AS topic_name
           FROM chapter c JOIN topic t ON t.chapter_id = c.id
          WHERE c.id IN ('apt.aptitude', 'apt.reasoning')`
      );

      const topicsByChapter = new Map();
      for (const row of chapters) {
        if (!topicsByChapter.has(row.chapter_id)) topicsByChapter.set(row.chapter_id, []);
        topicsByChapter.get(row.chapter_id).push(row);
      }

      const shares = [];
      for (const [, topics] of topicsByChapter) {
        const share = topics[0].question_count / topics.length;
        for (const t of topics) {
          shares.push({ id: t.topic_id, share });
          topicMeta.set(t.topic_id, t.topic_name);
        }
      }

      const questionsByTopicPreview = new Map();
      for (const q of withContent) {
        if (!topicMeta.has(q.topic_id)) continue;
        if (!questionsByTopicPreview.has(q.topic_id)) questionsByTopicPreview.set(q.topic_id, []);
        questionsByTopicPreview.get(q.topic_id).push(q);
      }
      const availableShares = shares.filter((s) => (questionsByTopicPreview.get(s.id) ?? []).length > 0);
      slots = allocateSlots(availableShares, TARGET_LENGTH);
    }

    const questionsByTopic = new Map();
    for (const q of withContent) {
      if (!topicMeta.has(q.topic_id)) continue;
      if (!questionsByTopic.has(q.topic_id)) questionsByTopic.set(q.topic_id, []);
      questionsByTopic.get(q.topic_id).push(q);
    }

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
        `INSERT INTO test (learner_id, question_count, template_id) VALUES ($1, $2, $3) RETURNING id`,
        [learnerId, picked.length, templateId]
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
