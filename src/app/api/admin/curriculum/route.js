import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireAdmin } from '../../../../lib/auth.mjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
const TYPES = new Set(['CONCEPT','GUIDED_PRACTICE','APPLICATION','EXAM_PRACTICE','PYQ','SPEED','REVISION','TEST','REMEDIATION']);

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const [{ rows: phases }, { rows: weeks }, { rows: days }, { rows: units }, { rows: concepts }, { rows: content }, { rows: topics }] = await Promise.all([
      query('SELECT id,curriculum_id,code,name,description,level,sort_order,duration_weeks FROM learning_phase ORDER BY sort_order'),
      query('SELECT id,phase_id,week_number,title,objective FROM learning_week ORDER BY phase_id,week_number'),
      query('SELECT id,week_id,day_number,title,purpose,target_minutes FROM learning_day ORDER BY week_id,day_number'),
      query('SELECT id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required FROM learning_unit ORDER BY day_id,sort_order'),
      query('SELECT id,topic_id,name,definition,sort_order FROM learning_concept ORDER BY topic_id,sort_order'),
      query('SELECT id,concept_id,topic_id,type,title,status,question_id,lesson_topic_id,resource_id FROM content_item ORDER BY created_at'),
      query('SELECT t.id,t.name,c.name AS chapter_name,s.name AS subject_name FROM topic t JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id ORDER BY s.sort_order,c.sort_order,t.sort_order'),
    ]);
    return NextResponse.json({ phases,weeks,days,units,concepts,content,topics });
  } catch (err) { return NextResponse.json({ code:'CURRICULUM_ADMIN_FAILED',message:err.message },{status:500}); }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code:'FORBIDDEN',message:'Admin access required' },{status:403});
  try {
    const b = await request.json();
    if (b.type === 'week') {
      if (!b.phaseId || !b.weekNumber || !b.title) throw new Error('phaseId, weekNumber and title are required');
      const id=`${b.phaseId}.week-${b.weekNumber}`;
      await query('INSERT INTO learning_week(id,phase_id,week_number,title,objective) VALUES($1,$2,$3,$4,$5)',[id,b.phaseId,Number(b.weekNumber),b.title,b.objective||null]);
      return NextResponse.json({id},{status:201});
    }
    if (b.type === 'day') {
      if (!b.weekId || !b.dayNumber || !b.title) throw new Error('weekId, dayNumber and title are required');
      const id=`${b.weekId}.day-${b.dayNumber}`;
      await query('INSERT INTO learning_day(id,week_id,day_number,title,purpose,target_minutes) VALUES($1,$2,$3,$4,$5,$6)',[id,b.weekId,Number(b.dayNumber),b.title,b.purpose||null,b.targetMinutes?Number(b.targetMinutes):null]);
      return NextResponse.json({id},{status:201});
    }
    if (b.type === 'unit') {
      if (!b.dayId || !b.title || !TYPES.has(b.unitType)) throw new Error('dayId, title and valid unitType are required');
      const id=`${b.dayId}.unit-${crypto.randomUUID().slice(0,8)}`;
      await query('INSERT INTO learning_unit(id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,b.dayId,b.topicId||null,b.title,b.unitType,Number(b.sortOrder)||0,b.estimatedMinutes?Number(b.estimatedMinutes):null,b.required!==false]);
      return NextResponse.json({id},{status:201});
    }
    if (b.type === 'concept') {
      if (!b.topicId || !b.name) throw new Error('topicId and name are required');
      const id=`${b.topicId}.concept-${crypto.randomUUID().slice(0,8)}`;
      await query('INSERT INTO learning_concept(id,topic_id,name,definition,sort_order) VALUES($1,$2,$3,$4,$5)',[id,b.topicId,b.name,b.definition||null,Number(b.sortOrder)||0]);
      return NextResponse.json({id},{status:201});
    }
    return NextResponse.json({code:'INVALID_TYPE',message:'type must be week, day, unit or concept'},{status:400});
  } catch(err) { return NextResponse.json({code:'CREATE_FAILED',message:err.message},{status:400}); }
}

export async function DELETE(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({code:'FORBIDDEN',message:'Admin access required'},{status:403});
  try {
    const b=await request.json();
    const table={week:'learning_week',day:'learning_day',unit:'learning_unit',concept:'learning_concept'}[b.type];
    if(!table||!b.id) return NextResponse.json({code:'INVALID_DELETE',message:'type and id are required'},{status:400});
    if(!/^[A-Za-z0-9._-]+$/.test(b.id)) return NextResponse.json({code:'INVALID_ID',message:'Invalid id'},{status:400});
    const r=await query(`DELETE FROM ${table} WHERE id=$1`,[b.id]);
    if(!r.rowCount) return NextResponse.json({code:'NOT_FOUND',message:'Curriculum item not found'},{status:404});
    return NextResponse.json({ok:true});
  } catch(err) { return NextResponse.json({code:'DELETE_FAILED',message:err.message},{status:400}); }
}
