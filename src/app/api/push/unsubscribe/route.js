import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/unsubscribe
 * body: { endpoint: string }
 */
export async function POST(request) {
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
    await query(`DELETE FROM push_subscription WHERE endpoint = $1`, [body.endpoint]);
    return NextResponse.json({ unsubscribed: true });
  } catch (err) {
    return NextResponse.json({ code: 'UNSUBSCRIBE_FAILED', message: err.message }, { status: 500 });
  }
}
