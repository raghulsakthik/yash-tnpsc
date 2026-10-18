import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

const QUESTIONS_PER_SUBJECT = 3;

/**
 * GET /api/onboarding/placement-quiz
 *
 * Builds a short diagnostic across whatever subjects actually have
 * published content right now -- deliberately not a hardcoded list of
 * "maths/polity/current-affairs/english/GS" questions, since only some of
 * those have real content in the bank today. As admin-uploaded content
 * grows into the empty subjects (English, current affairs, ...), this
 * quiz picks it up automatically with no code change.
 */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  try {
    const { rows: subjects } = await query(`SELECT id, name, sort_order FROM subject ORDER BY sort_order`);

    const picked = [];
    for (const subject of subjects) {
      const { rows } = await query(
        `SELECT q.id, q.prompt, q.options, t.id AS topic_id, t.name AS topic_name
           FROM question q
           JOIN topic t ON t.id = q.topic_id
           JOIN chapter c ON c.id = t.chapter_id
          WHERE c.subject_id = $1 AND q.status = 'PUBLISHED'
          ORDER BY random()
          LIMIT $2`,
        [subject.id, QUESTIONS_PER_SUBJECT]
      );
      for (const r of rows) {
        picked.push({
          questionId: r.id,
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: r.topic_id,
          topicName: r.topic_name,
          prompt: r.prompt,
          options: r.options,
        });
      }
    }

    return NextResponse.json({ questions: picked });
  } catch (err) {
    return NextResponse.json({ code: 'PLACEMENT_QUIZ_FAILED', message: err.message }, { status: 500 });
  }
}
