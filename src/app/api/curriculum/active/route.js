import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';
const CURRICULUM_ID = 'tnpsc-group-2-v1';

/** GET /api/curriculum/active -- learner's canonical Phase → Week → Day plan. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  try {
    const { rows: curriculum } = await query(`
      SELECT lc.learner_id, lc.status, lc.current_phase_id, lc.current_week_id, lc.current_day_id,
             p.code phase_code, p.name phase_name, p.level phase_level,
             w.week_number, w.title week_title, w.objective week_objective,
             d.day_number, d.title day_title, d.purpose day_purpose, d.target_minutes
        FROM learner_curriculum lc
        LEFT JOIN learning_phase p ON p.id = lc.current_phase_id
        LEFT JOIN learning_week w ON w.id = lc.current_week_id
        LEFT JOIN learning_day d ON d.id = lc.current_day_id
       WHERE lc.learner_id = $1 AND lc.curriculum_id = $2`, [learnerId, CURRICULUM_ID]);

    let current = curriculum[0];
    if (!current) {
      const { rows: first } = await query(`
        SELECT p.id phase_id, w.id week_id, d.id day_id
          FROM learning_phase p
          JOIN learning_week w ON w.phase_id=p.id
          JOIN learning_day d ON d.week_id=w.id
         WHERE p.curriculum_id=$1
         ORDER BY p.sort_order,w.week_number,d.day_number LIMIT 1`, [CURRICULUM_ID]);
      if (!first[0]) return NextResponse.json({ code: 'CURRICULUM_NOT_SEEDED' }, { status: 409 });
      await query(`INSERT INTO learner_curriculum(learner_id,curriculum_id,status,current_phase_id,current_week_id,current_day_id)
                   VALUES($1,$2,'ACTIVE',$3,$4,$5)`, [learnerId, CURRICULUM_ID, first[0].phase_id, first[0].week_id, first[0].day_id]);
      const { rows: created } = await query(`
        SELECT lc.learner_id,lc.status,lc.current_phase_id,lc.current_week_id,lc.current_day_id,
               p.code phase_code,p.name phase_name,p.level phase_level,w.week_number,w.title week_title,w.objective week_objective,
               d.day_number,d.title day_title,d.purpose day_purpose,d.target_minutes
          FROM learner_curriculum lc JOIN learning_phase p ON p.id=lc.current_phase_id
          JOIN learning_week w ON w.id=lc.current_week_id JOIN learning_day d ON d.id=lc.current_day_id
         WHERE lc.learner_id=$1 AND lc.curriculum_id=$2`, [learnerId, CURRICULUM_ID]);
      current = created[0];
    }

    const { rows: units } = await query(`
      SELECT u.id,u.topic_id,u.title,u.unit_type,u.sort_order,u.estimated_minutes,u.required,u.metadata,
             COALESCE(lup.status,'NOT_STARTED') progress_status,lup.score,lup.attempts,lup.completed_at,
             t.name topic_name
        FROM learning_unit u LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1
        LEFT JOIN topic t ON t.id=u.topic_id
       WHERE u.day_id=$2 ORDER BY u.sort_order`, [learnerId, current.current_day_id]);

    const { rows: milestones } = await query(`
      SELECT m.id,m.code,m.name,m.description,m.sort_order,COALESCE(lm.status,'LOCKED') status,COALESCE(lm.progress,0)::float8 progress
        FROM milestone m LEFT JOIN learner_milestone lm ON lm.milestone_id=m.id AND lm.learner_id=$1
       WHERE m.curriculum_id=$2 ORDER BY m.sort_order`, [learnerId, CURRICULUM_ID]);

    const { rows: placementRows } = await query(`
      SELECT level,level_name,score,answered_count,correct_count,recommended_phase_id,recommended_week_id,reason
        FROM learner_placement WHERE learner_id=$1 AND curriculum_id=$2`, [learnerId, CURRICULUM_ID]);
    const placement = placementRows[0] ? {
      level: placementRows[0].level,
      levelName: placementRows[0].level_name,
      score: Number(placementRows[0].score),
      answeredCount: placementRows[0].answered_count,
      correctCount: placementRows[0].correct_count,
      recommendedPhaseId: placementRows[0].recommended_phase_id,
      recommendedWeekId: placementRows[0].recommended_week_id,
      reason: placementRows[0].reason,
    } : null;

    const currentView = current ? { status: current.status, phaseName: current.phase_name, phaseLevel: current.phase_level, weekNumber: current.week_number, weekTitle: current.week_title, weekObjective: current.week_objective, dayNumber: current.day_number, dayTitle: current.day_title, dayPurpose: current.day_purpose, targetMinutes: current.target_minutes } : null;
    const unitView = units.map((u) => {
      const actionByType = {
        CONCEPT: u.topic_id ? `/lesson/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/journey',
        GUIDED_PRACTICE: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/practice',
        APPLICATION: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/practice',
        EXAM_PRACTICE: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/practice',
        PYQ: u.topic_id ? `/pyqs/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/pyqs',
        SPEED: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/practice',
        REVISION: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/revision',
        TEST: `/tests/weekly?unit=${encodeURIComponent(u.id)}`, 
        REMEDIATION: u.topic_id ? `/practice/${u.topic_id}?unit=${encodeURIComponent(u.id)}` : '/practice',
      };
      const actionUrl = u.metadata?.gateAssessment ? `/tests/weekly?unit=${encodeURIComponent(u.id)}` : (actionByType[u.unit_type] ?? '/learn');
      return { id: u.id, topicId: u.topic_id, title: u.title, unitType: u.unit_type, estimatedMinutes: u.estimated_minutes, required: u.required, progressStatus: u.progress_status, score: u.score == null ? null : Number(u.score), attempts: u.attempts, completedAt: u.completed_at, topicName: u.topic_name, actionUrl, metadata: u.metadata ?? {} };
    });
    return NextResponse.json({ curriculumId: CURRICULUM_ID, current: currentView, units: unitView, milestones, placement });
  } catch (err) {
    return NextResponse.json({ code: 'ACTIVE_CURRICULUM_FAILED', message: err.message }, { status: 500 });
  }
}
