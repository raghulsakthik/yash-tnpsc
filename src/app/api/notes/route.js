import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  const { rows } = await query(`SELECT id,course_title,title,content,tags,created_at FROM learner_note WHERE learner_id=$1 ORDER BY created_at DESC`, [learnerId]);
  return NextResponse.json({ notes: rows.map((n) => ({ id: n.id, courseTitle: n.course_title, title: n.title, content: n.content, tags: Array.isArray(n.tags) ? n.tags : [], date: new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) })) });
}

export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 }); }
  const title = String(body?.title || '').trim();
  const content = String(body?.content || '').trim();
  if (!title || !content) return NextResponse.json({ code: 'INVALID_NOTE', message: 'Title and content are required' }, { status: 400 });
  const courseTitle = String(body?.courseTitle || '').trim();
  const tags = Array.isArray(body?.tags) ? body.tags.map(String).map((x) => x.trim()).filter(Boolean).slice(0, 20) : [];
  const { rows } = await query(`INSERT INTO learner_note(learner_id,course_title,title,content,tags) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id,course_title,title,content,tags,created_at`, [learnerId, courseTitle, title, content, JSON.stringify(tags)]);
  const n = rows[0];
  return NextResponse.json({ note: { id: n.id, courseTitle: n.course_title, title: n.title, content: n.content, tags: n.tags, date: new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) } }, { status: 201 });
}
