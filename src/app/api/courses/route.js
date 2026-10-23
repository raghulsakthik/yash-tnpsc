import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';
const CURRICULUM_ID = 'tnpsc-group-2-v1';

export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  try {
    const { rows } = await query(`
      SELECT s.id subject_id,s.name subject_name,COALESCE(cs.sort_order,999) subject_order,
             c.id chapter_id,c.name chapter_name,t.id topic_id,t.name topic_name,
             COUNT(DISTINCT u.id)::int lesson_units,
             COUNT(DISTINCT CASE WHEN lup.status='COMPLETED' THEN u.id END)::int completed_units,
             COUNT(DISTINCT CASE WHEN u.unit_type='PYQ' THEN u.id END)::int pyq_units,
             COUNT(DISTINCT CASE WHEN u.unit_type='TEST' THEN u.id END)::int test_units
      FROM curriculum_subject cs JOIN subject s ON s.id=cs.subject_id
      LEFT JOIN chapter c ON c.subject_id=s.id LEFT JOIN topic t ON t.chapter_id=c.id
      LEFT JOIN learning_unit u ON u.topic_id=t.id
      LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1
      WHERE cs.curriculum_id=$2
      GROUP BY s.id,s.name,cs.sort_order,c.id,c.name,t.id,t.name
      ORDER BY cs.sort_order,c.sort_order,t.sort_order,t.name
    `,[learnerId,CURRICULUM_ID]);
    const subjects=[]; const bySubject=new Map();
    for(const r of rows){
      if(!bySubject.has(r.subject_id)){const s={id:r.subject_id,name:r.subject_name,chapters:[],completion:0,completedUnits:0,totalUnits:0};bySubject.set(r.subject_id,s);subjects.push(s)}
      const s=bySubject.get(r.subject_id); if(!r.chapter_id) continue;
      let c=s.chapters.find(x=>x.id===r.chapter_id); if(!c){c={id:r.chapter_id,name:r.chapter_name,lessons:[],completion:0};s.chapters.push(c)}
      if(!r.topic_id) continue;
      const total=Number(r.lesson_units||0),done=Number(r.completed_units||0);
      c.lessons.push({id:r.topic_id,title:r.topic_name,totalUnits:total,completedUnits:done,completion:total?Math.round(done/total*100):0,pyqUnits:Number(r.pyq_units||0),testUnits:Number(r.test_units||0),href:`/lesson/${r.topic_id}`});
      s.totalUnits+=total;s.completedUnits+=done;
    }
    for(const s of subjects){s.completion=s.totalUnits?Math.round(s.completedUnits/s.totalUnits*100):0;for(const c of s.chapters){const total=c.lessons.reduce((n,l)=>n+l.totalUnits,0),done=c.lessons.reduce((n,l)=>n+l.completedUnits,0);c.completion=total?Math.round(done/total*100):0}}
    const totals=subjects.reduce((a,s)=>({total:a.total+s.totalUnits,done:a.done+s.completedUnits}),{total:0,done:0});
    return NextResponse.json({curriculumId:CURRICULUM_ID,exam:'TNPSC Group 2 / 2A',subjects,overallCompletion:totals.total?Math.round(totals.done/totals.total*100):0,totalUnits:totals.total,completedUnits:totals.done});
  } catch(error){return NextResponse.json({code:'COURSES_FAILED',message:error.message},{status:500})}
}
