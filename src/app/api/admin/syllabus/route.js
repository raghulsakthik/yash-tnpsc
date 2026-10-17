import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireAdmin } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/syllabus -- the real subject/chapter/topic tree, for the upload form's pickers. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  }

  try {
    const [{ rows: subjects }, { rows: chapters }, { rows: topics }, { rows: counts }] = await Promise.all([
      query(`SELECT id, name, sort_order FROM subject ORDER BY sort_order`),
      query(`SELECT id, subject_id, name, sort_order FROM chapter ORDER BY sort_order`),
      query(`SELECT id, chapter_id, name, sort_order FROM topic ORDER BY sort_order`),
      query(`SELECT topic_id, COUNT(*)::int AS n FROM question GROUP BY topic_id`),
    ]);

    const countByTopic = new Map(counts.map((c) => [c.topic_id, c.n]));
    const topicsByChapter = new Map();
    for (const t of topics) {
      if (!topicsByChapter.has(t.chapter_id)) topicsByChapter.set(t.chapter_id, []);
      topicsByChapter.get(t.chapter_id).push({ id: t.id, name: t.name, questionCount: countByTopic.get(t.id) ?? 0 });
    }
    const chaptersBySubject = new Map();
    for (const c of chapters) {
      if (!chaptersBySubject.has(c.subject_id)) chaptersBySubject.set(c.subject_id, []);
      chaptersBySubject.get(c.subject_id).push({ id: c.id, name: c.name, topics: topicsByChapter.get(c.id) ?? [] });
    }

    const tree = subjects.map((s) => ({ id: s.id, name: s.name, chapters: chaptersBySubject.get(s.id) ?? [] }));

    return NextResponse.json({ subjects: tree });
  } catch (err) {
    return NextResponse.json({ code: 'SYLLABUS_FAILED', message: err.message }, { status: 500 });
  }
}
