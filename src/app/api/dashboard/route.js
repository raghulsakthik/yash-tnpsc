import { NextResponse } from 'next/server';
import { query } from '../../../lib/db.mjs';
import { requireLearnerId } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';
const CURRICULUM_ID = 'tnpsc-group-2-v1';

export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  try {
    const [
      { rows: profileRows }, { rows: curriculumRows }, { rows: activityRows },
      { rows: subjectRows }, { rows: badgeRows }, { rows: weakRows },
      { rows: currentUnitRows }, { rows: recentRows },
    ] = await Promise.all([
      query(`SELECT l.name,lp.language,lp.daily_goal_minutes,lp.exam FROM learner l LEFT JOIN learner_profile lp ON lp.learner_id=l.id WHERE l.id=$1`, [learnerId]),
      query(`SELECT c.id curriculum_id,c.name curriculum_name,c.version,p.id phase_id,p.name phase_name,p.level phase_level,w.id week_id,w.week_number,w.title week_title,w.objective week_objective,d.id day_id,d.day_number,d.title day_title,d.purpose day_purpose,d.target_minutes,(SELECT COUNT(*) FROM learning_unit u2 JOIN learning_day d2 ON d2.id=u2.day_id JOIN learning_week w2 ON w2.id=d2.week_id JOIN learning_phase p2 ON p2.id=w2.phase_id WHERE p2.curriculum_id=c.id AND u2.required) total_required_units,(SELECT COUNT(*) FROM learning_unit u2 JOIN learning_day d2 ON d2.id=u2.day_id JOIN learning_week w2 ON w2.id=d2.week_id JOIN learning_phase p2 ON p2.id=w2.phase_id LEFT JOIN learner_unit_progress lup2 ON lup2.unit_id=u2.id AND lup2.learner_id=$1 WHERE p2.curriculum_id=c.id AND u2.required AND lup2.status='COMPLETED') completed_required_units FROM learner_curriculum lc JOIN curriculum c ON c.id=lc.curriculum_id LEFT JOIN learning_phase p ON p.id=lc.current_phase_id LEFT JOIN learning_week w ON w.id=lc.current_week_id LEFT JOIN learning_day d ON d.id=lc.current_day_id LEFT JOIN learning_unit u ON u.day_id=d.id LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1 WHERE lc.learner_id=$1 AND lc.curriculum_id=$2 LIMIT 1`, [learnerId, CURRICULUM_ID]),
      query(`SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS activity_date,COUNT(*)::int count FROM question_attempt WHERE learner_id=$1 AND created_at>=now()-interval '365 days' GROUP BY activity_date ORDER BY activity_date`, [learnerId]),
      query(`SELECT s.id subject_id,s.name subject_name,COUNT(DISTINCT t.id)::int topic_count,COUNT(DISTINCT lts.topic_id)::int attempted_topics,COALESCE(ROUND(AVG(lts.mastery_score)*100,1),0)::float8 mastery,COALESCE(SUM(lts.attempt_count),0)::int attempts FROM subject s LEFT JOIN chapter c ON c.subject_id=s.id LEFT JOIN topic t ON t.chapter_id=c.id LEFT JOIN learner_topic_state lts ON lts.topic_id=t.id AND lts.learner_id=$1 GROUP BY s.id,s.name,s.sort_order ORDER BY s.sort_order`, [learnerId]),
      query(`SELECT a.id,a.name,a.description,a.icon,la.unlocked_at FROM achievement a JOIN learner_achievement la ON la.achievement_id=a.id AND la.learner_id=$1 ORDER BY la.unlocked_at DESC LIMIT 4`, [learnerId]),
      query(`SELECT t.id topic_id,t.name topic_name,s.name subject_name,ROUND(COALESCE(lts.mastery_score,0)*100,1)::float8 mastery,lts.attempt_count FROM learner_topic_state lts JOIN topic t ON t.id=lts.topic_id JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id WHERE lts.learner_id=$1 AND lts.attempt_count>0 ORDER BY lts.mastery_score ASC,lts.attempt_count DESC LIMIT 4`, [learnerId]),
      query(`SELECT u.id,u.title,u.unit_type,u.topic_id,u.estimated_minutes,u.required,COALESCE(lup.status,'NOT_STARTED') progress_status,t.name topic_name FROM learner_curriculum lc JOIN learning_unit u ON u.day_id=lc.current_day_id LEFT JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1 LEFT JOIN topic t ON t.id=u.topic_id WHERE lc.learner_id=$1 AND lc.curriculum_id=$2 AND COALESCE(lup.status,'NOT_STARTED')<>'COMPLETED' ORDER BY u.sort_order LIMIT 3`, [learnerId, CURRICULUM_ID]),
      query(`SELECT qa.created_at,qa.correct,qa.time_taken_ms,t.id topic_id,t.name topic_name FROM question_attempt qa JOIN topic t ON t.id=qa.topic_id WHERE qa.learner_id=$1 ORDER BY qa.created_at DESC LIMIT 5`, [learnerId]),
    ]);

    const profile=profileRows[0]??{name:'Learner',language:'en',daily_goal_minutes:30};
    const c=curriculumRows[0]??null;
    const totalRequired=Number(c?.total_required_units??0), completedRequired=Number(c?.completed_required_units??0);
    const today=new Date().toISOString().slice(0,10);
    const activity=activityRows.map(r=>({date:String(r.activity_date),count:Number(r.count)}));
    const activityMap=new Map(activity.map(d=>[d.date,d.count]));
    const heatmap=[]; const cursor=new Date(`${today}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate()-364);
    for(let i=0;i<365;i+=1){const date=cursor.toISOString().slice(0,10);heatmap.push({date,count:activityMap.get(date)??0});cursor.setUTCDate(cursor.getUTCDate()+1);}
    const totalQuestions=activity.reduce((s,d)=>s+d.count,0), activeDays=activity.filter(d=>d.count>0).length, todayQuestions=activityMap.get(today)??0;
    return NextResponse.json({
      learner:{name:profile.name,language:profile.language,dailyGoalMinutes:Number(profile.daily_goal_minutes??30),exam:profile.exam},
      curriculum:c?{id:c.curriculum_id,name:c.curriculum_name,version:c.version,phase:{id:c.phase_id,name:c.phase_name,level:c.phase_level},week:{id:c.week_id,number:c.week_number,title:c.week_title,objective:c.week_objective},day:{id:c.day_id,number:c.day_number,title:c.day_title,purpose:c.day_purpose,targetMinutes:c.target_minutes},progress:{completed:completedRequired,total:totalRequired,percentage:totalRequired?Math.round(completedRequired/totalRequired*100):0}}:null,
      activity:{heatmap,totalQuestions,activeDays,todayQuestions,last30Questions:heatmap.slice(-30).reduce((s,d)=>s+d.count,0)},
      subjects:subjectRows.map(s=>({id:s.subject_id,name:s.subject_name,topicCount:Number(s.topic_count),attemptedTopics:Number(s.attempted_topics),mastery:Number(s.mastery),attempts:Number(s.attempts)})),
      badges:badgeRows.map(b=>({id:b.id,name:b.name,description:b.description,icon:b.icon,unlockedAt:b.unlocked_at})),
      weakTopics:weakRows.map(w=>({topicId:w.topic_id,topicName:w.topic_name,subjectName:w.subject_name,mastery:Number(w.mastery),attempts:Number(w.attempt_count)})),
      currentUnits:currentUnitRows.map(u=>({id:u.id,title:u.title,unitType:u.unit_type,topicId:u.topic_id,topicName:u.topic_name,estimatedMinutes:Number(u.estimated_minutes??0),required:u.required,progressStatus:u.progress_status})),
      recent:recentRows.map(r=>({createdAt:r.created_at,correct:r.correct,timeTakenMs:r.time_taken_ms,topicId:r.topic_id,topicName:r.topic_name})),
    });
  } catch(err) { return NextResponse.json({code:'DASHBOARD_FAILED',message:err.message},{status:500}); }
}
