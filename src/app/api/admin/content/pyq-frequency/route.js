import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/pyq-frequency
 *
 * Turns the 2011-2025 PYQ archive into the "which topics actually get
 * examined, and how often" signal a syllabus-only view can't give you --
 * real counts per topic per year, not a guess. Used to prioritize which
 * topics most need more content (high frequency, thin bank) over ones
 * that are rarely examined.
 */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { rows } = await query(`
    SELECT t.id AS topic_id, t.name AS topic_name, c.subject_id,
           q.source_year,
           COUNT(*)::int AS pyq_count
      FROM question q
      JOIN topic t ON t.id = q.topic_id
      JOIN chapter c ON c.id = t.chapter_id
     WHERE q.source_year IS NOT NULL
     GROUP BY t.id, t.name, c.subject_id, q.source_year
     ORDER BY t.name, q.source_year
  `);

  const { rows: totalContent } = await query(`
    SELECT topic_id, COUNT(*)::int AS total_questions
      FROM question
     WHERE status = 'PUBLISHED'
     GROUP BY topic_id
  `);
  const contentByTopic = new Map(totalContent.map((r) => [r.topic_id, r.total_questions]));

  const byTopic = new Map();
  for (const r of rows) {
    if (!byTopic.has(r.topic_id)) {
      byTopic.set(r.topic_id, { topicId: r.topic_id, topicName: r.topic_name, subjectId: r.subject_id, totalPyqs: 0, years: {} });
    }
    const entry = byTopic.get(r.topic_id);
    entry.years[r.source_year] = r.pyq_count;
    entry.totalPyqs += r.pyq_count;
  }

  const topics = [...byTopic.values()]
    .map((t) => ({
      ...t,
      publishedQuestions: contentByTopic.get(t.topicId) ?? 0,
      // A topic the exam asks about often but the bank barely covers --
      // the gap a content-generation pass should close first.
      contentGapScore: t.totalPyqs > 0 ? t.totalPyqs / Math.max(1, contentByTopic.get(t.topicId) ?? 0) : 0,
    }))
    .sort((a, b) => b.totalPyqs - a.totalPyqs);

  return NextResponse.json({ topics });
}
