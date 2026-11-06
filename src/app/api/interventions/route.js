import { NextResponse } from 'next/server';
import { requireLearner } from '../../../lib/auth.mjs';
import { startIntervention, listInterventions } from '../../../services/interventionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/interventions — every intervention ever started for this
 * learner, newest first: the experiment log Phase 14 exists to build.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const interventions = await listInterventions(learner.id);
    return NextResponse.json({ interventions });
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTIONS_LIST_FAILED', message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/interventions
 * body: { topicId }
 *
 * Starts tracking an intervention: snapshots current mastery/retention as
 * the baseline and tags it with whatever the Adaptive Decision Engine
 * (Phase 11) currently recommends for this topic.
 */
export async function POST(request) {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { topicId } = body;
  if (!topicId) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'topicId is required' }, { status: 400 });
  }

  try {
    const intervention = await startIntervention(learner.id, topicId);
    return NextResponse.json(intervention);
  } catch (err) {
    return NextResponse.json({ code: 'INTERVENTION_START_FAILED', message: err.message }, { status: 500 });
  }
}
