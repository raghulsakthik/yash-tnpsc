import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';
const CURRICULUM_ID = 'tnpsc-group-2-v1';

export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  try {
    const [{ rows: current }, { rows: phases }, { rows: days }] = await Promise.all([
      query(`SELECT lc.current_phase_id,lc.current_week_id,lc.current_day_id,w.week_number,d.day_number,p.name AS phase_name,w.title AS week_title,d.title AS day_title FROM learner_curriculum lc LEFT JOIN learning_week w ON w.id=lc.current_week_id LEFT JOIN learning_day d ON d.id=lc.current_day_id LEFT JOIN learning_phase p ON p.id=lc.current_phase_id WHERE lc.learner_id=$1 AND lc.curriculum_id=$2`, [learnerId, CURRICULUM_ID]),
      query(`SELECT p.id,p.name,p.description,p.level,p.sort_order,p.duration_weeks,COUNT(u.id) FILTER (WHERE u.required)::int total_required,COUNT(u.id) FILTER (WHERE u.required AND lup.status='COMPLETED')::int completed_required FROM learning_phase p LEFT JOIN learning_week w ON w.phase_id=p.id LEFT JOIN learning_day d ON d.week_id=w.id LEFT JOIN learning_unit u ON u.day_id=d.id LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1 WHERE p.curriculum_id=$2 GROUP BY p.id ORDER BY p.sort_order`, [learnerId, CURRICULUM_ID]),
      query(`SELECT d.id,d.week_id,d.day_number,d.title,d.purpose,d.target_minutes,COUNT(u.id) FILTER (WHERE u.required)::int total_required,COUNT(u.id) FILTER (WHERE u.required AND lup.status='COMPLETED')::int completed_required FROM learning_day d JOIN learning_week w ON w.id=d.week_id JOIN learning_phase p ON p.id=w.phase_id LEFT JOIN learning_unit u ON u.day_id=d.id LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1 WHERE p.curriculum_id=$2 GROUP BY d.id ORDER BY MIN(w.week_number),d.day_number`, [learnerId, CURRICULUM_ID]),
    ]);
    const active = current[0] || null;
    const activePhaseIndex = phases.findIndex((p) => p.id === active?.current_phase_id);
    const phaseView = phases.map((p, index) => ({ id: p.id, name: p.name, description: p.description, level: Number(p.level), durationWeeks: Number(p.duration_weeks || 0), status: index < activePhaseIndex ? 'COMPLETED' : index === activePhaseIndex ? 'CURRENT' : 'LOCKED', progress: Number(p.total_required) ? Math.round((Number(p.completed_required) / Number(p.total_required)) * 100) : 0, totalRequired: Number(p.total_required), completedRequired: Number(p.completed_required) }));
    const activeWeekDays = days.filter((d) => d.week_id === active?.current_week_id).map((d) => ({ id: d.id, dayNumber: Number(d.day_number), title: d.title, purpose: d.purpose, targetMinutes: Number(d.target_minutes || 0), totalRequired: Number(d.total_required), completedRequired: Number(d.completed_required), status: Number(d.completed_required) >= Number(d.total_required) && Number(d.total_required) > 0 ? 'COMPLETED' : d.id === active?.current_day_id ? 'CURRENT' : 'UPCOMING' }));
    return NextResponse.json({ current: active, phases: phaseView, weekDays: activeWeekDays });
  } catch (err) {
    return NextResponse.json({ code: 'CURRICULUM_PROGRESS_FAILED', message: err.message }, { status: 500 });
  }
}
