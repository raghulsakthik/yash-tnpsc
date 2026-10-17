import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }
  return NextResponse.json({ email: session.email, role: session.role });
}
