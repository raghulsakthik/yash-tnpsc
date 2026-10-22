import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth.mjs';
import { query } from '../../../../lib/db.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code:'UNAUTHENTICATED', message:'Login required' }, { status:401 });
  const learnerId = user.id;
  try {
    const [topics, attempts, tests, subjects] = await Promise.all([
      query(`SELECT lts.topic_id AS "topicId", t.name AS "topicName", lts.accuracy_score::float8 AS accuracy,
                    lts.speed_score::float8 AS speed, lts.attempt_count AS attempts, lts.last_studied_at AS "lastStudiedAt"
               FROM learner_topic_state lts JOIN topic t ON t.id=lts.topic_id
              WHERE lts.learner_id=$1 ORDER BY lts.accuracy_score ASC, lts.attempt_count DESC`, [learnerId]),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE correct)::int AS correct,
                    COALESCE(SUM(time_taken_ms),0)::bigint AS timeMs
               FROM question_attempt WHERE learner_id=$1`, [learnerId]),
      query(`SELECT COUNT(*) FILTER(WHERE status='COMPLETED')::int AS completed,
                    COALESCE(AVG(score) FILTER(WHERE status='COMPLETED'),0)::float8 AS averageScore
               FROM test WHERE learner_id=$1`, [learnerId]),
      query(`SELECT s.id AS "subjectId", s.name AS "subjectName", AVG(lts.accuracy_score)::float8 AS accuracy
               FROM learner_topic_state lts JOIN topic t ON t.id=lts.topic_id JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id
              WHERE lts.learner_id=$1 AND lts.attempt_count>0 GROUP BY s.id,s.name ORDER BY accuracy DESC`, [learnerId]),
    ]);
    return NextResponse.json({ topics: topics.rows, attempts: attempts.rows[0], tests: tests.rows[0], subjects: subjects.rows });
  } catch (err) { return NextResponse.json({ code:'ANALYTICS_FAILED', message:err.message }, { status:500 }); }
}
