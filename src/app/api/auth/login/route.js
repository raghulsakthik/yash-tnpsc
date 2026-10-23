import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { verifyPassword, createSession } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'Email and password are required' }, { status: 400 });
  }

  const { rows } = await query(
    'SELECT id, password_hash, role FROM app_user WHERE lower(email) = lower($1) AND status = \'ACTIVE\'',
    [email]
  );
  const account = rows[0];
  if (!account || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' }, { status: 401 });
  }

  const { cookie } = await createSession(account.id);
  const res = NextResponse.json({ role: account.role });
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
