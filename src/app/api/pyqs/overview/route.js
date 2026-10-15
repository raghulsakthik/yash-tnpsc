import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pyqs/overview
 *
 * "What they have actually asked" — attempted/correct/accuracy over real
 * past-paper questions, grouped by year and by topic. One query, grouped
 * in JS the same way /api/tests/[id]/result already groups by topic.
 */
export async function GET() {
  try {
    const [{ rows }, { rows: frequencyRows }] = await Promise.all([
      query(
        `SELECT qa.correct, qa.created_at, qa.mistake_type, q.source_year, q.topic_id, t.name AS topic_name
           FROM question_attempt qa
           JOIN question q ON q.id = qa.question_id
           JOIN topic t ON t.id = q.topic_id
          WHERE qa.learner_id = $1 AND q.source LIKE 'tnpsc-%'`,
        [LEARNER_ID]
      ),
      // Content stat, not a learner stat: how often each topic actually
      // appears across the transcribed past papers, independent of what
      // she has attempted — the "what keeps coming back" panel.
      query(
        `SELECT t.id AS topic_id, t.name AS topic_name, COUNT(*)::int AS n
           FROM question q JOIN topic t ON t.id = q.topic_id
          WHERE q.source LIKE 'tnpsc-%'
          GROUP BY t.id, t.name
          ORDER BY n DESC`
      ),
    ]);

    const byYear = new Map();
    const byTopic = new Map();
    const mistakeTypeCounts = new Map();
    let correctTotal = 0;

    for (const r of rows) {
      if (r.correct) correctTotal += 1;
      if (!r.correct && r.mistake_type) {
        mistakeTypeCounts.set(r.mistake_type, (mistakeTypeCounts.get(r.mistake_type) ?? 0) + 1);
      }

      const y = byYear.get(r.source_year) ?? { year: r.source_year, attempted: 0, correct: 0 };
      y.attempted += 1;
      if (r.correct) y.correct += 1;
      byYear.set(r.source_year, y);

      const t = byTopic.get(r.topic_id) ?? { topicId: r.topic_id, topicName: r.topic_name, attempted: 0, correct: 0 };
      t.attempted += 1;
      if (r.correct) t.correct += 1;
      byTopic.set(r.topic_id, t);
    }

    const withAccuracy = (m) =>
      [...m.values()].map((x) => ({ ...x, accuracyPct: x.attempted > 0 ? Math.round((x.correct / x.attempted) * 100) : 0 }));

    return NextResponse.json({
      attempted: rows.length,
      correct: correctTotal,
      accuracyPct: rows.length > 0 ? Math.round((correctTotal / rows.length) * 100) : 0,
      byYear: withAccuracy(byYear).sort((a, b) => a.year - b.year),
      byTopic: withAccuracy(byTopic).sort((a, b) => a.accuracyPct - b.accuracyPct),
      topicFrequency: frequencyRows.map((r) => ({ topicId: r.topic_id, topicName: r.topic_name, questionCount: r.n })),
      mistakeTypeCounts: Object.fromEntries(mistakeTypeCounts),
    });
  } catch (err) {
    return NextResponse.json({ code: 'PYQS_OVERVIEW_FAILED', message: err.message }, { status: 500 });
  }
}
