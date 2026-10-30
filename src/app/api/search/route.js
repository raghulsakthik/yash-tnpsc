import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q=...
 *
 * Searches topics (by name), lessons (by title/concept), and questions
 * (by prompt text) in one pass -- real ILIKE matches against the live
 * database, nothing indexed/precomputed. Short-circuits under 2 characters
 * to avoid a useless full-table scan on every keystroke.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ topics: [], lessons: [], questions: [] });
  }
  const like = `%${q}%`;

  try {
    const [{ rows: topics }, { rows: lessons }, { rows: questions }] = await Promise.all([
      query(
        `SELECT t.id, t.name, c.name AS chapter_name, s.name AS subject_name
           FROM topic t JOIN chapter c ON c.id = t.chapter_id JOIN subject s ON s.id = c.subject_id
          WHERE t.name ILIKE $1
          ORDER BY t.name LIMIT 8`,
        [like]
      ),
      query(
        `SELECT topic_id, title, concept FROM lesson WHERE status = 'PUBLISHED' AND (title ILIKE $1 OR concept ILIKE $1) LIMIT 8`,
        [like]
      ),
      query(
        `SELECT q.id, q.topic_id, q.prompt, t.name AS topic_name
           FROM question q JOIN topic t ON t.id = q.topic_id
          WHERE q.prompt ILIKE $1 AND q.status = 'PUBLISHED'
          LIMIT 8`,
        [like]
      ),
    ]);

    return NextResponse.json({
      topics: topics.map((t) => ({ topicId: t.id, name: t.name, chapterName: t.chapter_name, subjectName: t.subject_name })),
      lessons: lessons.map((l) => ({ topicId: l.topic_id, title: l.title, snippet: l.concept.slice(0, 140) })),
      questions: questions.map((q2) => ({ questionId: q2.id, topicId: q2.topic_id, topicName: q2.topic_name, prompt: q2.prompt })),
    });
  } catch (err) {
    return NextResponse.json({ code: 'SEARCH_FAILED', message: err.message }, { status: 500 });
  }
}
