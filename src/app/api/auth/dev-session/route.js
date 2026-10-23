import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { createSession } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ code: 'NOT_AVAILABLE', message: 'Development session is disabled in production.' }, { status: 404 });
  }

  const legacyId = '00000000-0000-0000-0000-000000000001';
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.status, l.name
       FROM app_user u
       JOIN learner l ON l.id = u.id
      WHERE u.id = $1 AND u.status = 'ACTIVE'`,
    [legacyId]
  );

  if (!rows[0]) {
    return NextResponse.json({ code: 'DEV_USER_MISSING', message: 'Legacy prototype learner is missing.' }, { status: 500 });
  }

  const { cookie } = await createSession(rows[0].id);
  const next = new URL(request.url).searchParams.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const response = NextResponse.redirect(new URL(safeNext, request.url));
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
