import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../lib/auth.mjs';
import { getTopicState } from '../../../../../../services/learnerStateService.mjs';
import { NotFoundError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: 'Login required' }, { status: 401 });
  const { topicId } = await params;
  try {
    return NextResponse.json(await getTopicState(user.id, topicId));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TOPIC_STATE_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'TOPIC_STATE_FAILED', message: err.message }, { status: 500 });
  }
}
