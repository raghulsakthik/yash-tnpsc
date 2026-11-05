import { NextResponse } from 'next/server';
import { requireLearner } from '../../../lib/auth.mjs';
import { getAchievements } from '../../../services/milestoneService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/milestones
 *
 * Current streak plus whatever's already been unlocked and persisted — a
 * pure read, no evaluation and no writes. The frontend never computes or
 * sends a streak; it only ever reads what the backend has already decided.
 */
export async function GET() {
  const learner = await requireLearner();
  if (!learner) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'A learner session is required.' }, { status: 401 });
  try {
    const result = await getAchievements(learner.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'MILESTONES_FAILED', message: err.message }, { status: 500 });
  }
}
