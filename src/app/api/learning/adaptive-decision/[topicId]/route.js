import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/auth.mjs';
import { decideNextActionForTopic } from '../../../../../services/adaptiveDecisionService.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  const { topicId } = await params;
  try {
    return NextResponse.json(await decideNextActionForTopic(user.id, topicId));
  } catch (err) {
    return NextResponse.json({ code: 'ADAPTIVE_DECISION_FAILED', message: err.message }, { status: 500 });
  }
}
