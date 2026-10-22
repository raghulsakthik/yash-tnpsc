import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/curriculum -- canonical course structure for Web and Android. */
export async function GET() {
  try {
    const [{ rows: exams }, { rows: curriculumDefs }, { rows: sections }, { rows: subjects }, { rows: phases }, { rows: weeks }, { rows: days }, { rows: units }, { rows: milestones }] = await Promise.all([
      query(`SELECT id, code, name, total_questions FROM exam ORDER BY id`),
      query(`SELECT id, exam_id, name, version, status FROM curriculum ORDER BY id`),
      query(`SELECT id, curriculum_id, code, name, sort_order FROM curriculum_section ORDER BY sort_order`),
      query(`SELECT cs.curriculum_id, cs.section_id, cs.subject_id, cs.sort_order, s.name
              FROM curriculum_subject cs JOIN subject s ON s.id = cs.subject_id
              ORDER BY cs.sort_order`),
      query(`SELECT id, curriculum_id, code, name, description, level, sort_order, duration_weeks
              FROM learning_phase ORDER BY sort_order`),
      query(`SELECT id, phase_id, week_number, title, objective FROM learning_week ORDER BY phase_id, week_number`),
      query(`SELECT id, week_id, day_number, title, purpose, target_minutes FROM learning_day ORDER BY week_id, day_number`),
      query(`SELECT id, day_id, topic_id, title, unit_type, sort_order, estimated_minutes, required FROM learning_unit ORDER BY day_id, sort_order`),
      query(`SELECT id, curriculum_id, phase_id, code, name, description, sort_order, unlock_rules
              FROM milestone ORDER BY sort_order`),
    ]);

    const curriculumIds = new Set([
      ...sections.map((r) => r.curriculum_id),
      ...phases.map((r) => r.curriculum_id),
      ...milestones.map((r) => r.curriculum_id),
    ]);
    const curricula = [];
    for (const curriculumId of curriculumIds) {
      const definition = curriculumDefs.find((r) => r.id === curriculumId);
      const curriculum = { id: curriculumId, examId: definition?.exam_id ?? null, name: definition?.name ?? null, version: definition?.version ?? null, status: definition?.status ?? null, sections: [], phases: [], milestones: [] };
      for (const section of sections.filter((r) => r.curriculum_id === curriculumId)) {
        curriculum.sections.push({
          id: section.id, code: section.code, name: section.name, sortOrder: section.sort_order,
          subjects: subjects.filter((s) => s.curriculum_id === curriculumId && s.section_id === section.id)
            .map((s) => ({ id: s.subject_id, name: s.name, sortOrder: s.sort_order })),
        });
      }
      curriculum.phases = phases.filter((p) => p.curriculum_id === curriculumId).map((p) => ({
        ...p,
        weeks: weeks.filter((w) => w.phase_id === p.id).map((w) => ({
          ...w,
          days: days.filter((d) => d.week_id === w.id).map((d) => ({
            ...d,
            units: units.filter((u) => u.day_id === d.id),
          })),
        })),
      }));
      curriculum.milestones = milestones.filter((m) => m.curriculum_id === curriculumId);
      curricula.push(curriculum);
    }

    return NextResponse.json({ exams, curricula });
  } catch (err) {
    return NextResponse.json({ code: 'CURRICULUM_FAILED', message: err.message }, { status: 500 });
  }
}
