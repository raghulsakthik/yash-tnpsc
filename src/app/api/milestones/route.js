import { NextResponse } from 'next/server';
import { LEARNER_ID } from '../../../lib/db.mjs';
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
  try {
    const result = await getAchievements(LEARNER_ID);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'MILESTONES_FAILED', message: err.message }, { status: 500 });
  }
}
