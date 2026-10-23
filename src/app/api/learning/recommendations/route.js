import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth.mjs';
import { getRecommendationsForLearner, surfaceRecommendation } from '../../../../services/recommendationService.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  const limit = new URL(request.url).searchParams.get('limit');
  return NextResponse.json({ recommendations: await getRecommendationsForLearner(user.id, limit) });
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.topicId) return NextResponse.json({ code: 'MISSING_FIELDS', message: 'topicId is required' }, { status: 400 });
    return NextResponse.json(await surfaceRecommendation(user.id, body.topicId), { status: 201 });
  } catch (err) {
    return NextResponse.json({ code: 'RECOMMENDATION_FAILED', message: err.message }, { status: 500 });
  }
}
