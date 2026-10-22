import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth.mjs';
import { decideNextActionForTopic } from '../../../../services/adaptiveDecisionService.mjs';
import { selectDailyTopicForLearner } from '../../../../services/dailyPlanService.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  const requestedTopic = new URL(request.url).searchParams.get('topic');
  try {
    let topicId = requestedTopic;
    if (!topicId) {
      const { selectedTopic } = await selectDailyTopicForLearner(user.id);
      topicId = selectedTopic?.id;
    }
    if (!topicId) return NextResponse.json({ code: 'NO_LEARNING_TOPIC', message: 'No published learning topic is available.' }, { status: 404 });
    return NextResponse.json(await decideNextActionForTopic(user.id, topicId));
  } catch (err) {
    return NextResponse.json({ code: 'NEXT_ACTION_FAILED', message: err.message }, { status: 500 });
  }
}
