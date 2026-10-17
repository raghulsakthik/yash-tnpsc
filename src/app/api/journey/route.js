import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';
import { topicStatus, orbitRing, longestStreak } from '../../../domain/progress.mjs';

export const dynamic = 'force-dynamic';

// Deterministic per-topic angle so the orbit doesn't reshuffle on every
// reload — derived from the topic id rather than stored anywhere.
function angleFor(topicId) {
  let hash = 0;
  for (let i = 0; i < topicId.length; i++) hash = (hash * 31 + topicId.charCodeAt(i)) % 360;
  return hash;
}

/**
 * GET /api/journey
 *
 * Every topic she's touched, placed on the orbit by real state, plus
 * personal records derived from real history (not a leaderboard — just
 * her own best numbers). Topics with zero attempts are left out: an
 * untouched topic has nothing to show on the orbit yet.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const [{ rows: states }, { rows: due }, { rows: bestTest }, { rows: fastest }, { rows: streakRows }] = await Promise.all([
      query(
        `SELECT lts.topic_id, t.name, lts.attempt_count, lts.mastery_score::float8 AS mastery_score,
                rs.interval_days::float8 AS interval_days
           FROM learner_topic_state lts
           JOIN topic t ON t.id = lts.topic_id
           LEFT JOIN revision_schedule rs ON rs.learner_id = lts.learner_id AND rs.topic_id = lts.topic_id
          WHERE lts.learner_id = $1 AND lts.attempt_count > 0`,
        [learnerId]
      ),
      query(`SELECT topic_id FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`, [learnerId]),
      query(`SELECT MAX(score)::float8 AS best FROM test WHERE learner_id = $1 AND status = 'COMPLETED'`, [learnerId]),
      query(
        `SELECT MIN(time_taken_ms)::int AS fastest FROM question_attempt WHERE learner_id = $1 AND correct = true`,
        [learnerId]
      ),
      query(
        `SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS day FROM question_attempt WHERE learner_id = $1`,
        [learnerId]
      ),
    ]);

    const dueTopics = new Set(due.map((d) => d.topic_id));

    const orbit = states.map((s) => {
      const status = topicStatus({
        attemptCount: s.attempt_count,
        masteryScore: s.mastery_score,
        revisionDue: dueTopics.has(s.topic_id),
        intervalDays: s.interval_days,
      });
      return { name: s.name, ring: orbitRing(status), angleDeg: angleFor(s.topic_id) };
    });

    const longest = longestStreak(streakRows.map((r) => r.day.toISOString().slice(0, 10)));

    const bestRetained = states
      .filter((s) => s.interval_days !== null)
      .sort((a, b) => (b.interval_days ?? 0) - (a.interval_days ?? 0))[0];

    return NextResponse.json({
      orbit,
      personalRecords: [
        { label: 'Longest streak', value: `${longest} day${longest === 1 ? '' : 's'}` },
        { label: 'Highest test score', value: bestTest[0]?.best != null ? `${Math.round(bestTest[0].best)}%` : '—' },
        { label: 'Fastest correct answer', value: fastest[0]?.fastest != null ? `${(fastest[0].fastest / 1000).toFixed(1)}s` : '—' },
        { label: 'Best retained', value: bestRetained?.name ?? '—' },
      ],
    });
  } catch (err) {
    return NextResponse.json({ code: 'JOURNEY_FAILED', message: err.message }, { status: 500 });
  }
}
