import { NextResponse } from 'next/server';
import { query, recordEvent } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { selectQuestion } from '../../../../domain/selection.mjs';
import { difficultyBand } from '../../../../domain/difficulty.mjs';

export const dynamic = 'force-dynamic';

/**
 * Picks one real topic at random, weighted by its chapter's real exam
 * question_count (the same "exam weight" concept src/domain/testGen.mjs
 * uses to size a weekly test) -- so Mixed Practice draws more often from
 * heavier chapters, never arbitrarily/uniformly across however many
 * topics happen to exist.
 */
async function pickMixedTopic() {
  const { rows } = await query(`
    SELECT t.id, c.question_count,
           (SELECT COUNT(*)::int FROM topic t2 WHERE t2.chapter_id = c.id) AS topics_in_chapter
      FROM topic t
      JOIN chapter c ON c.id = t.chapter_id
     WHERE EXISTS (SELECT 1 FROM question q WHERE q.topic_id = t.id AND q.status = 'PUBLISHED')
  `);
  if (rows.length === 0) return null;

  // Capped: a chapter's real exam weight divided across very few actual
  // topics (a newly-created chapter that only has one topic so far, for
  // instance) would otherwise dominate Mixed Practice far out of
  // proportion to how "big" that chapter really is meant to be -- the cap
  // keeps real, well-populated chapters weighted correctly relative to
  // each other while stopping a sparse one from taking over.
  const MAX_TOPIC_WEIGHT = 3;
  const weighted = rows.map((r) => ({
    id: r.id,
    weight: Math.min(r.question_count / Math.max(1, r.topics_in_chapter), MAX_TOPIC_WEIGHT),
  }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * (total || 1);
  for (const w of weighted) {
    roll -= w.weight || 1 / weighted.length;
    if (roll <= 0) return w.id;
  }
  return weighted[weighted.length - 1].id;
}

/**
 * GET /api/questions/next?topic=aptitude.fractions
 * topic=mixed picks a real topic at random (weighted by exam weight) on
 * every call, for "practice across everything" rather than one topic.
 *
 * The backend decides which question comes next. The frontend displays it.
 * No difficulty logic ever moves to the client.
 */
export async function GET(request) {
  let topicId = new URL(request.url).searchParams.get('topic') ?? 'aptitude.fractions';

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    if (topicId === 'mixed') {
      const picked = await pickMixedTopic();
      if (!picked) {
        return NextResponse.json({ code: 'NO_QUESTIONS', message: 'No published questions anywhere yet' }, { status: 404 });
      }
      topicId = picked;
    }

    const { rows: stateRows } = await query(
      `SELECT current_difficulty, attempt_count, next_action
         FROM learner_topic_state WHERE learner_id = $1 AND topic_id = $2`,
      [learnerId, topicId]
    );

    const targetDifficulty = Number(stateRows[0]?.current_difficulty ?? 0.3);

    // Candidates, with how often she has seen each and how long ago.
    const { rows: candidates } = await query(
      `SELECT q.id,
              q.prompt,
              q.options,
              q.image_data,
              q.difficulty::float8          AS difficulty,
              q.estimated_seconds,
              q.source,
              t.name                        AS topic_name,
              COUNT(a.id)::int              AS seen_count,
              COALESCE(
                (SELECT COUNT(*) FROM question_attempt a2
                  WHERE a2.learner_id = $1 AND a2.topic_id = $2
                    AND a2.created_at > MAX(a.created_at)), 999
              )::int                        AS attempts_since_last_seen
         FROM question q
         JOIN topic t ON t.id = q.topic_id
         LEFT JOIN question_attempt a
           ON a.question_id = q.id AND a.learner_id = $1
        WHERE q.topic_id = $2 AND q.status = 'PUBLISHED'
        GROUP BY q.id, t.name`,
      [learnerId, topicId]
    );

    if (candidates.length === 0) {
      return NextResponse.json(
        { code: 'NO_QUESTIONS', message: `No published questions for ${topicId}` },
        { status: 404 }
      );
    }

    const chosen = selectQuestion(
      candidates.map((c) => ({
        ...c,
        seenCount: c.seen_count,
        attemptsSinceLastSeen: c.attempts_since_last_seen,
      })),
      targetDifficulty
    );

    await recordEvent(learnerId, 'QUESTION_VIEWED', topicId, { questionId: chosen.id });

    // The answer index is deliberately not in this payload.
    return NextResponse.json({
      questionId: chosen.id,
      topicId,
      topicName: chosen.topic_name,
      prompt: chosen.prompt,
      options: chosen.options,
      imageData: chosen.image_data,
      estimatedSeconds: chosen.estimated_seconds,
      difficulty: difficultyBand(chosen.difficulty),
      targetDifficulty,
      attemptCount: stateRows[0]?.attempt_count ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { code: 'NEXT_QUESTION_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
