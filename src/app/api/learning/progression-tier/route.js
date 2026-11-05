import { NextResponse } from 'next/server';
import { requireLearner } from '../../../../lib/auth.mjs';
import { getProgressionTier } from '../../../../services/intermediateProgressionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learning/progression-tier
 *
 * Whether every real foundation topic has been mastered-and-confirmed
 * (Phase 13's gate, not just practice accuracy) — a progression state, not
 * a calendar date, with each foundation topic's own gate result attached.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const tier = await getProgressionTier(learner.id);
    return NextResponse.json(tier);
  } catch (err) {
    return NextResponse.json({ code: 'PROGRESSION_TIER_FAILED', message: err.message }, { status: 500 });
  }
}
