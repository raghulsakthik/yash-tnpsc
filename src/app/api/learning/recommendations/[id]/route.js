import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.mjs';
import { acceptRecommendationForLearner, dismissRecommendationForLearner } from '../../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === 'DISMISS') return NextResponse.json(await dismissRecommendationForLearner(user.id, id));
    return NextResponse.json(await acceptRecommendationForLearner(user.id, id));
  } catch (err) {
    const status = err.name === 'NotFoundError' ? 404 : 400;
    return NextResponse.json({ code: 'RECOMMENDATION_ACTION_FAILED', message: err.message }, { status });
  }
}
