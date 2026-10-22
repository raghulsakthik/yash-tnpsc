import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db.mjs';
import { createSession, hashPassword, validateRegistration } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const error = validateRegistration({ name, email, password });
  if (error) return NextResponse.json({ code: 'VALIDATION_ERROR', message: error }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM app_user WHERE lower(email) = lower($1)', [email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' }, { status: 409 });
    }

    const legacy = await client.query(
      `SELECT id FROM app_user WHERE email IS NULL AND id = '00000000-0000-0000-0000-000000000001' FOR UPDATE`
    );
    let userId;
    let role = 'STUDENT';
    const passwordHash = await hashPassword(password);
    if (legacy.rows.length) {
      userId = legacy.rows[0].id;
      await client.query(`UPDATE app_user SET email=$1, password_hash=$2, updated_at=now() WHERE id=$3`, [email, passwordHash, userId]);
      await client.query('UPDATE learner SET name=$1, updated_at=now() WHERE id=$2', [name, userId]);
    } else {
      const learner = await client.query(`INSERT INTO learner (name) VALUES ($1) RETURNING id`, [name]);
      userId = learner.rows[0].id;
      await client.query(`INSERT INTO learner_profile (learner_id) VALUES ($1) ON CONFLICT (learner_id) DO NOTHING`, [userId]);
      role = 'STUDENT';
      await client.query(`INSERT INTO app_user (id,email,password_hash,role) VALUES ($1,$2,$3,$4)`, [userId,email,passwordHash,role]);
    }
    await client.query('COMMIT');
    const { cookie } = await createSession(userId);
    const response = NextResponse.json({ user: { id:userId,name,email,role } }, { status:201 });
    response.cookies.set(cookie.name, cookie.value, cookie);
    return response;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ code:'REGISTER_FAILED', message:err.message }, { status:500 });
  } finally { client.release(); }
}
