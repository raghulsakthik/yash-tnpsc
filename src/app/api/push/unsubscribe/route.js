import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/unsubscribe
 * body: { endpoint: string }
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'endpoint is required' }, { status: 400 });
  }

  try {
    await query(`DELETE FROM push_subscription WHERE endpoint = $1 AND learner_id = $2`, [body.endpoint, learnerId]);
    return NextResponse.json({ unsubscribed: true });
  } catch (err) {
    return NextResponse.json({ code: 'UNSUBSCRIBE_FAILED', message: err.message }, { status: 500 });
  }
}
