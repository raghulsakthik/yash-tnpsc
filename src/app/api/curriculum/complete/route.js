import { NextResponse } from 'next/server';
import { pool, recordEvent } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';
const CURRICULUM_ID = 'tnpsc-group-2-v1';


async function evaluatePhaseGate(client, learnerId, phaseId, overrideScore = null) {
  const { rows: rules } = await client.query(`
    SELECT id, name, unlock_rules
      FROM milestone
     WHERE curriculum_id=$1 AND phase_id=$2
     ORDER BY sort_order LIMIT 1`, [CURRICULUM_ID, phaseId]);
  if (!rules[0]) return { required: false, passed: true, reason: null };

  const rule = rules[0].unlock_rules ?? {};
  const { rows: tests } = await client.query(`
    SELECT lup.score::float8 AS score
      FROM learning_unit u
      JOIN learning_day d ON d.id=u.day_id
      JOIN learning_week w ON w.id=d.week_id
      JOIN learner_unit_progress lup ON lup.unit_id=u.id AND lup.learner_id=$1
     WHERE w.phase_id=$2 AND u.unit_type='TEST' AND lup.status='COMPLETED' AND lup.score IS NOT NULL
     ORDER BY lup.completed_at DESC`, [learnerId, phaseId]);
  const scores = tests.map((r) => Number(r.score)).filter(Number.isFinite);
  const latestScore = overrideScore == null ? scores[0] : Number(overrideScore);

  if (rule.minimum_weekly_average != null) {
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    if (average < Number(rule.minimum_weekly_average)) {
      return { required: true, passed: false, milestoneId: rules[0].id, milestoneName: rules[0].name, reason: `Weekly test average ${average.toFixed(1)}% is below ${rule.minimum_weekly_average}%`, score: average };
    }
  }
  if (rule.assessment_required && latestScore < Number(rule.minimum_weekly_average ?? 80)) {
    return { required: true, passed: false, milestoneId: rules[0].id, milestoneName: rules[0].name, reason: `Assessment score ${Number.isFinite(latestScore) ? latestScore.toFixed(1) : '0.0'}% is below the required threshold`, score: Number.isFinite(latestScore) ? latestScore : 0 };
  }
  if (rule.minimum_mastery != null) {
    const { rows: masteryRows } = await client.query(`
      SELECT AVG(lts.mastery_score)::float8 AS mastery
        FROM learner_topic_state lts
       WHERE lts.learner_id=$1
         AND lts.topic_id IN (
           SELECT DISTINCT u.topic_id
             FROM learning_unit u JOIN learning_day d ON d.id=u.day_id JOIN learning_week w ON w.id=d.week_id
            WHERE w.phase_id=$2 AND u.topic_id IS NOT NULL
         )`, [learnerId, phaseId]);
    const mastery = Number(masteryRows[0]?.mastery ?? 0);
    if (mastery < Number(rule.minimum_mastery)) {
      return { required: true, passed: false, milestoneId: rules[0].id, milestoneName: rules[0].name, reason: `Topic mastery ${(mastery * 100).toFixed(1)}% is below ${(Number(rule.minimum_mastery) * 100).toFixed(0)}%`, score: mastery * 100 };
    }
  }
  if (rule.minimum_mock_count != null) {
    const count = scores.length;
    const average = count ? scores.reduce((a, b) => a + b, 0) / count : 0;
    if (count < Number(rule.minimum_mock_count) || average < Number(rule.minimum_mock_average ?? 0)) {
      return { required: true, passed: false, milestoneId: rules[0].id, milestoneName: rules[0].name, reason: `Mock readiness requires ${rule.minimum_mock_count} tests at ${rule.minimum_mock_average}% average; current ${count} at ${average.toFixed(1)}%`, score: average };
    }
  }
  return { required: true, passed: true, milestoneId: rules[0].id, milestoneName: rules[0].name, score: latestScore };
}

/** POST /api/curriculum/complete -- complete the current unit and advance the canonical path. */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { /* empty body is valid */ }
  const unitId = body.unitId;
  const score = body.score == null ? null : Number(body.score);
  const topicPerformance = Array.isArray(body.topicPerformance) ? body.topicPerformance : [];
  if (score != null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    return NextResponse.json({ code: 'INVALID_SCORE', message: 'score must be between 0 and 100' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: currentRows } = await client.query(`
      SELECT lc.current_phase_id,lc.current_week_id,lc.current_day_id,
             u.id unit_id,u.required,u.title,u.unit_type,u.metadata unit_metadata,
             d.day_number,d.week_id,w.week_number,w.phase_id,p.sort_order phase_sort,w.title week_title
        FROM learner_curriculum lc
        JOIN learning_day d ON d.id=lc.current_day_id
        JOIN learning_week w ON w.id=d.week_id
        JOIN learning_phase p ON p.id=w.phase_id
        LEFT JOIN learning_unit u ON u.day_id=d.id AND ($2::text IS NULL OR u.id=$2)
       WHERE lc.learner_id=$1 AND lc.curriculum_id=$3
       ORDER BY u.sort_order`, [learnerId, unitId ?? null, CURRICULUM_ID]);
    if (!currentRows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'CURRICULUM_NOT_STARTED' }, { status: 409 });
    }
    const current = currentRows[0];
    if (unitId && !currentRows.some((r) => r.unit_id === unitId)) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'UNIT_NOT_CURRENT', message: 'That unit is not part of the current learning day' }, { status: 409 });
    }

    const required = currentRows.filter((r) => r.unit_id && r.required);
    const targetUnitIds = unitId ? [unitId] : required.map((r) => r.unit_id);
    if (!targetUnitIds.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'NO_UNITS' }, { status: 409 });
    }
    for (const id of targetUnitIds) {
      await client.query(`
        INSERT INTO learner_unit_progress(learner_id,unit_id,status,score,attempts,started_at,completed_at,updated_at)
        VALUES($1,$2,'COMPLETED',$3,1,now(),now(),now())
        ON CONFLICT (learner_id,unit_id) DO UPDATE SET status='COMPLETED',score=COALESCE(EXCLUDED.score,learner_unit_progress.score),attempts=learner_unit_progress.attempts+1,completed_at=now(),updated_at=now()`,
        [learnerId, id, score]);
    }

    const { rows: remaining } = await client.query(`
      SELECT COUNT(*)::int count FROM learning_unit u
      LEFT JOIN learner_unit_progress p ON p.unit_id=u.id AND p.learner_id=$1
      WHERE u.day_id=$2 AND u.required=true AND COALESCE(p.status,'NOT_STARTED') <> 'COMPLETED'`, [learnerId, current.current_day_id]);

    let next = null;
    let eventType = 'CURRICULUM_UNIT_COMPLETED';
    if (remaining[0].count === 0) {
      const { rows: nextDay } = await client.query(`
        SELECT d.id day_id,w.id week_id,w.phase_id,p.id phase_id,p.sort_order phase_sort,w.week_number,d.day_number
          FROM learning_day d JOIN learning_week w ON w.id=d.week_id JOIN learning_phase p ON p.id=w.phase_id
         WHERE w.phase_id=$1 AND ((w.id=$2 AND d.day_number>$3) OR w.week_number>$4)
         ORDER BY w.week_number,d.day_number LIMIT 1`, [current.phase_id, current.current_week_id, current.day_number, current.week_number]);
      if (nextDay[0]) {
        next = nextDay[0];
      } else {
        const { rows: nextPhase } = await client.query(`
          SELECT d.id day_id,w.id week_id,w.phase_id,p.sort_order phase_sort,w.week_number,d.day_number
            FROM learning_phase p JOIN learning_week w ON w.phase_id=p.id JOIN learning_day d ON d.week_id=w.id
           WHERE p.curriculum_id=$1 AND p.sort_order>$2 ORDER BY p.sort_order,w.week_number,d.day_number LIMIT 1`, [CURRICULUM_ID, current.phase_sort]);
        if (nextPhase[0]) next = nextPhase[0];
      }
      if (next) {
        // A phase milestone is a real unlock gate: completing all units is not
        // enough to enter the next phase unless its evidence rules are met.
        const gate = await evaluatePhaseGate(
          client,
          learnerId,
          current.phase_id,
          current.unit_metadata?.gateAssessment ? score : null
        );
        if (gate.required && !gate.passed) {
          const gateUnitId = `${current.current_day_id}.phase-gate-${current.phase_id.replace(/[^a-zA-Z0-9._-]/g, '-')}`.slice(0, 250);
          const gateTitle = `Phase gate · ${gate.milestoneName}`;
          await client.query(`
            INSERT INTO learning_unit(id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required,metadata)
            VALUES($1,$2,NULL,$3,'REMEDIATION',$4,30,true,$5::jsonb)
            ON CONFLICT (id) DO UPDATE SET required=true,metadata=learning_unit.metadata || EXCLUDED.metadata`, [
              gateUnitId, current.current_day_id, gateTitle, 999,
              JSON.stringify({ gateAssessment: true, phaseId: current.phase_id, milestoneId: gate.milestoneId, reason: gate.reason, thresholdScore: 80 })
            ]
          );
          if (unitId && current.unit_metadata?.gateAssessment) {
            await client.query(`UPDATE learner_unit_progress SET status='REMEDIAL',updated_at=now() WHERE learner_id=$1 AND unit_id=$2`, [learnerId, unitId]);
          }
          await client.query('COMMIT');
          await recordEvent(learnerId,'CURRICULUM_GATE_BLOCKED',current.current_day_id,{unitId:unitId ?? targetUnitIds[0],score,gate});
          return NextResponse.json({ completed: targetUnitIds, advanced: false, eventType:'CURRICULUM_GATE_BLOCKED', gate: { milestoneId:gate.milestoneId, milestoneName:gate.milestoneName, reason:gate.reason, score:gate.score }, next:null });
        }

        // Weekly-test evidence can create a targeted remediation unit on the
        // learner's next day. A topic needs enough evidence (2+ questions)
        // and a sub-70% result to be considered weak. The remediation is
        // required, so the learner must address the weakness before advancing
        // beyond that day.
        const weakTopics = topicPerformance
          .filter((item) => item && item.topicId && Number(item.total) >= 2 && (Number(item.correct) / Number(item.total)) * 100 < 70)
          .slice(0, 3);
        if (weakTopics.length) {
          const { rows: maxOrderRows } = await client.query(
            `SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM learning_unit WHERE day_id=$1`,
            [next.day_id]
          );
          let order = maxOrderRows[0]?.max_order ?? 0;
          for (const weak of weakTopics) {
            const safeTopicId = String(weak.topicId);
            const slug = safeTopicId.replace(/[^a-zA-Z0-9._-]/g, '-');
            const remediationId = `${next.day_id}.remediation-${slug}`.slice(0, 250);
            const existing = await client.query(`SELECT 1 FROM learning_unit WHERE id=$1`, [remediationId]);
            if (existing.rowCount) continue;
            order += 1;
            await client.query(`
              INSERT INTO learning_unit(id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required,metadata)
              VALUES($1,$2,$3,$4,'REMEDIATION',$5,20,true,$6::jsonb)`, [
                remediationId,
                next.day_id,
                safeTopicId,
                `Remediation · ${weak.topicName ?? safeTopicId}`,
                order,
                JSON.stringify({ source: 'WEEKLY_TEST', score: (Number(weak.correct) / Number(weak.total)) * 100, correct: Number(weak.correct), total: Number(weak.total) }),
              ]
            );
          }
        }
        await client.query(`UPDATE learner_curriculum SET current_phase_id=$2,current_week_id=$3,current_day_id=$4,updated_at=now() WHERE learner_id=$1 AND curriculum_id=$5`, [learnerId,next.phase_id,next.week_id,next.day_id,CURRICULUM_ID]);
        eventType = next.phase_id !== current.phase_id ? 'CURRICULUM_PHASE_ADVANCED' : next.week_id !== current.current_week_id ? 'CURRICULUM_WEEK_ADVANCED' : 'CURRICULUM_DAY_ADVANCED';
      } else {
        await client.query(`UPDATE learner_curriculum SET status='COMPLETED',updated_at=now() WHERE learner_id=$1 AND curriculum_id=$2`, [learnerId,CURRICULUM_ID]);
        eventType = 'CURRICULUM_COMPLETED';
      }
    }

    // Milestone progress is intentionally evidence-based: unit completion gives progress,
    // while phase-level gates remain locked until their stated assessment/mastery criteria exist.
    const { rows: milestoneRows } = await client.query(`
      SELECT m.id,m.phase_id,m.unlock_rules,COUNT(u.id)::int total,COUNT(p.unit_id) FILTER (WHERE p.status='COMPLETED')::int completed
        FROM milestone m LEFT JOIN learning_phase ph ON ph.id=m.phase_id
        LEFT JOIN learning_week w ON w.phase_id=ph.id LEFT JOIN learning_day d ON d.week_id=w.id LEFT JOIN learning_unit u ON u.day_id=d.id
        LEFT JOIN learner_unit_progress p ON p.unit_id=u.id AND p.learner_id=$1
       WHERE m.curriculum_id=$2 GROUP BY m.id,m.phase_id,m.unlock_rules,m.sort_order ORDER BY m.sort_order`, [learnerId,CURRICULUM_ID]);
    for (const m of milestoneRows) {
      const progress = m.total ? Math.round((m.completed / m.total) * 10000) / 100 : 0;
      const gateStatus = m.phase_id === current.phase_id && next ? 'ACHIEVED' : progress >= 100 ? 'IN_PROGRESS' : progress > 0 ? 'IN_PROGRESS' : 'LOCKED';
      const gateProgress = gateStatus === 'ACHIEVED' ? 100 : progress;
      await client.query(`INSERT INTO learner_milestone(learner_id,milestone_id,status,progress,achieved_at,updated_at) VALUES($1,$2,$3,$4,CASE WHEN $3='ACHIEVED' THEN now() ELSE NULL END,now()) ON CONFLICT (learner_id,milestone_id) DO UPDATE SET status=CASE WHEN learner_milestone.status='ACHIEVED' THEN 'ACHIEVED' ELSE EXCLUDED.status END,progress=CASE WHEN learner_milestone.status='ACHIEVED' THEN 100 ELSE EXCLUDED.progress END,achieved_at=CASE WHEN learner_milestone.status='ACHIEVED' THEN learner_milestone.achieved_at ELSE EXCLUDED.achieved_at END,updated_at=now()`, [learnerId,m.id,gateStatus,gateProgress]);
    }

    await client.query('COMMIT');
    await recordEvent(learnerId,eventType,current.current_day_id,{unitId:unitId ?? targetUnitIds[0],score,next});
    return NextResponse.json({ completed: targetUnitIds, advanced: Boolean(next), eventType, next: next ? { phaseId:next.phase_id,weekId:next.week_id,dayId:next.day_id,weekNumber:next.week_number,dayNumber:next.day_number } : null });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code: 'CURRICULUM_COMPLETE_FAILED', message: err.message }, { status: 500 });
  } finally { client.release(); }
}
