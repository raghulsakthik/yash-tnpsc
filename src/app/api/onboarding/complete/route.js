import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { recordAttempt, RecordAttemptError } from '../../../../lib/attempts.mjs';

export const dynamic = 'force-dynamic';

const CURRICULUM_ID = 'tnpsc-group-2-v1';

function placementLevel(score) {
  if (score >= 90) return { level: 5, name: 'Advanced' };
  if (score >= 80) return { level: 4, name: 'Exam Level' };
  if (score >= 65) return { level: 2, name: 'Core' };
  if (score >= 40) return { level: 1, name: 'Foundation' };
  return { level: 0, name: 'Orientation' };
}

async function resolvePlacement(client, score) {
  const target = placementLevel(score);
  const { rows } = await client.query(`
    SELECT p.id phase_id,p.level,p.name phase_name,w.id week_id,w.week_number,d.id day_id,d.day_number
      FROM learning_phase p
      JOIN learning_week w ON w.phase_id=p.id
      JOIN learning_day d ON d.week_id=w.id
     WHERE p.curriculum_id=$1 AND p.level <= $2
     ORDER BY p.level DESC,w.week_number,d.day_number LIMIT 1`, [CURRICULUM_ID, target.level]);
  return { target, start: rows[0] ?? null };
}

/**
 * POST /api/onboarding/complete
 * body: {
 *   language: 'en' | 'ta',
 *   dailyGoalMinutes: number,
 *   answers: [{ questionId, selectedIndex }]   -- from the placement quiz
 * }
 *
 * Grades every placement answer through the same pipeline a real practice
 * attempt uses (mastery, difficulty, revision scheduling all update from
 * it immediately -- the placement quiz isn't a throwaway survey, it's the
 * learner's first real data), saves the stated preferences, and marks
 * onboarding done so this never runs again for this learner.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const language = body.language === 'ta' ? 'ta' : 'en';
  const dailyGoalMinutes = Number.isInteger(body.dailyGoalMinutes) ? body.dailyGoalMinutes : 30;
  const answers = Array.isArray(body.answers) ? body.answers : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let correctCount = 0;
    const validAnswers = answers.filter((a) => a?.questionId);
    for (const a of validAnswers) {
      if (!a?.questionId) continue;
      try {
        const result = await recordAttempt({
          client,
          learnerId,
          questionId: a.questionId,
          attemptId: crypto.randomUUID(),
          selectedIndex: Number.isInteger(a.selectedIndex) ? a.selectedIndex : null,
          timeTakenMs: 0,
          mode: 'PRACTICE',
        });
        if (result.correct) correctCount += 1;
      } catch (err) {
        if (!(err instanceof RecordAttemptError)) throw err;
        // A stale/unknown question id in the submitted answers shouldn't
        // fail the whole onboarding -- skip it and keep going.
      }
    }

    const questionIds = validAnswers.map((a) => a.questionId);
    const { rows: diagnosticRows } = questionIds.length ? await client.query(`
      SELECT q.id question_id,q.topic_id,t.name topic_name,c.subject_id,s.name subject_name,q.answer_index
        FROM question q
        JOIN topic t ON t.id=q.topic_id
        JOIN chapter c ON c.id=t.chapter_id
        JOIN subject s ON s.id=c.subject_id
       WHERE q.id = ANY($1::text[])`, [questionIds]) : { rows: [] };
    const byId = new Map(diagnosticRows.map((r) => [r.question_id, r]));
    const topicMap = new Map();
    const subjectMap = new Map();
    for (const a of validAnswers) {
      const q = byId.get(a.questionId);
      if (!q) continue;
      const correct = Number.isInteger(a.selectedIndex) && a.selectedIndex === q.answer_index;
      const topic = topicMap.get(q.topic_id) ?? { topicId: q.topic_id, topicName: q.topic_name, correct: 0, total: 0 };
      topic.total += 1;
      if (correct) topic.correct += 1;
      topicMap.set(q.topic_id, topic);
      const subject = subjectMap.get(q.subject_id) ?? { subjectId: q.subject_id, subjectName: q.subject_name, correct: 0, total: 0 };
      subject.total += 1;
      if (correct) subject.correct += 1;
      subjectMap.set(q.subject_id, subject);
    }
    const topicScores = [...topicMap.values()].map((x) => ({ ...x, score: x.total ? Math.round((x.correct / x.total) * 10000) / 100 : 0 }));
    const subjectScores = [...subjectMap.values()].map((x) => ({ ...x, score: x.total ? Math.round((x.correct / x.total) * 10000) / 100 : 0 }));
    const answeredCount = topicScores.reduce((n, x) => n + x.total, 0);
    const measuredCorrect = topicScores.reduce((n, x) => n + x.correct, 0);
    const diagnosticScore = answeredCount ? (measuredCorrect / answeredCount) * 100 : 0;
    const placement = await resolvePlacement(client, diagnosticScore);
    if (!placement.start) throw new Error('No curriculum learning path is seeded for placement');

    await client.query(`
      INSERT INTO learner_placement(learner_id,curriculum_id,level,level_name,score,answered_count,correct_count,topic_scores,subject_scores,recommended_phase_id,recommended_week_id,reason,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,now())
      ON CONFLICT (learner_id) DO UPDATE SET curriculum_id=EXCLUDED.curriculum_id,level=EXCLUDED.level,level_name=EXCLUDED.level_name,score=EXCLUDED.score,answered_count=EXCLUDED.answered_count,correct_count=EXCLUDED.correct_count,topic_scores=EXCLUDED.topic_scores,subject_scores=EXCLUDED.subject_scores,recommended_phase_id=EXCLUDED.recommended_phase_id,recommended_week_id=EXCLUDED.recommended_week_id,reason=EXCLUDED.reason,updated_at=now()`,
      [learnerId, CURRICULUM_ID, placement.target.level, placement.target.name, diagnosticScore, answeredCount, measuredCorrect, JSON.stringify(topicScores), JSON.stringify(subjectScores), placement.start.phase_id, placement.start.week_id, `Diagnostic performance ${diagnosticScore.toFixed(1)}% placed the learner at ${placement.target.name}.`]
    );

    await client.query(`
      INSERT INTO learner_curriculum(learner_id,curriculum_id,status,current_phase_id,current_week_id,current_day_id)
      VALUES($1,$2,'ACTIVE',$3,$4,$5)
      ON CONFLICT (learner_id,curriculum_id) DO UPDATE SET status='ACTIVE',current_phase_id=EXCLUDED.current_phase_id,current_week_id=EXCLUDED.current_week_id,current_day_id=EXCLUDED.current_day_id,updated_at=now()`,
      [learnerId, CURRICULUM_ID, placement.start.phase_id, placement.start.week_id, placement.start.day_id]
    );

    await client.query(
      `UPDATE learner_profile SET language = $2, daily_goal_minutes = $3, onboarded = true, updated_at = now()
       WHERE learner_id = $1`,
      [learnerId, language, dailyGoalMinutes]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      answeredCount,
      correctCount: measuredCorrect,
      score: Math.round(diagnosticScore * 100) / 100,
      placement: {
        level: placement.target.level,
        levelName: placement.target.name,
        phaseId: placement.start.phase_id,
        phaseName: placement.start.phase_name,
        weekId: placement.start.week_id,
        weekNumber: placement.start.week_number,
        dayId: placement.start.day_id,
        dayNumber: placement.start.day_number,
        reason: `Diagnostic performance ${diagnosticScore.toFixed(1)}% placed the learner at ${placement.target.name}.`,
      },
      topicScores,
      subjectScores,
      firstTopicId: topicScores.find((x) => x.score < 70)?.topicId ?? topicScores[0]?.topicId ?? 'aptitude.whole-numbers',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'ONBOARDING_FAILED', message: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
