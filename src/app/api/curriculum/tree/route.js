import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const curriculumId = new URL(request.url).searchParams.get('curriculumId') || 'tnpsc-group-2-v1';
  try {
    const { rows: curricula } = await query('SELECT id, exam_id, name, version, status FROM curriculum WHERE id=$1',[curriculumId]);
    if (!curricula[0]) return NextResponse.json({ code:'CURRICULUM_NOT_FOUND' },{status:404});
    const [phases,weeks,days,units,concepts,content] = await Promise.all([
      query('SELECT id,curriculum_id,code,name,description,level,sort_order,duration_weeks FROM learning_phase WHERE curriculum_id=$1 ORDER BY sort_order',[curriculumId]),
      query('SELECT w.id,w.phase_id,w.week_number,w.title,w.objective FROM learning_week w JOIN learning_phase p ON p.id=w.phase_id WHERE p.curriculum_id=$1 ORDER BY p.sort_order,w.week_number',[curriculumId]),
      query('SELECT d.id,d.week_id,d.day_number,d.title,d.purpose,d.target_minutes FROM learning_day d JOIN learning_week w ON w.id=d.week_id JOIN learning_phase p ON p.id=w.phase_id WHERE p.curriculum_id=$1 ORDER BY p.sort_order,w.week_number,d.day_number',[curriculumId]),
      query('SELECT u.id,u.day_id,u.topic_id,u.title,u.unit_type,u.sort_order,u.estimated_minutes,u.required FROM learning_unit u JOIN learning_day d ON d.id=u.day_id JOIN learning_week w ON w.id=d.week_id JOIN learning_phase p ON p.id=w.phase_id WHERE p.curriculum_id=$1 ORDER BY p.sort_order,w.week_number,d.day_number,u.sort_order',[curriculumId]),
      query('SELECT c.id,c.topic_id,c.name,c.definition,c.sort_order FROM learning_concept c'),
      query("SELECT id,concept_id,topic_id,type,title,body,question_id,lesson_topic_id,resource_id,status,metadata FROM content_item WHERE status <> 'ARCHIVED' ORDER BY created_at"),
    ]);
    const tree=phases.rows.map(p=>({...p,weeks:weeks.rows.filter(w=>w.phase_id===p.id).map(w=>({...w,days:days.rows.filter(d=>d.week_id===w.id).map(d=>({...d,units:units.rows.filter(u=>u.day_id===d.id).map(u=>({...u,concepts:concepts.rows.filter(c=>c.topic_id===u.topic_id).map(c=>({...c,content:content.rows.filter(i=>i.concept_id===c.id||(!i.concept_id&&i.topic_id===c.topic_id))}))}))}))}))}));
    return NextResponse.json({curriculum:curricula[0],phases:tree});
  } catch(err) { return NextResponse.json({code:'CURRICULUM_TREE_FAILED',message:err.message},{status:500}); }
}
