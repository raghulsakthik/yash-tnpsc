import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db.mjs';
import { getCurrentUser, hashPassword, requireUser } from '../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

const adminRoles = new Set(['ADMIN','SUPER_ADMIN']);

export async function GET() {
  try {
    const user = await requireUser();
  if (!user) return NextResponse.json({ code:'UNAUTHENTICATED', message:'Login required' }, { status:401 });
    if (!adminRoles.has(user.role)) return NextResponse.json({ code:'FORBIDDEN', message:'Admin access required' }, { status:403 });
    const { rows } = await pool.query(
      `SELECT u.id,l.name,u.email,u.role,u.status,u.email_verified,u.last_login_at,u.created_at,u.updated_at
         FROM app_user u JOIN learner l ON l.id=u.id ORDER BY u.created_at DESC`
    );
    return NextResponse.json({ users: rows });
  } catch (err) {
    return NextResponse.json({ code:err.code ?? 'USERS_FAILED', message:err.message }, { status:err.code === 'UNAUTHENTICATED' ? 401 : 500 });
  }
}

export async function PATCH(request) {
  try {
    const actor = await requireUser();
    if (!actor) return NextResponse.json({ code:'UNAUTHENTICATED', message:'Login required' }, { status:401 });
    const body = await request.json();
    const targetId = body.id ?? actor.id;
    if (targetId !== actor.id && !adminRoles.has(actor.role)) return NextResponse.json({ code:'FORBIDDEN', message:'You can only edit your own account.' }, { status:403 });
    if (body.role && actor.role !== 'SUPER_ADMIN') return NextResponse.json({ code:'FORBIDDEN', message:'Only a super admin can change roles.' }, { status:403 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (body.name !== undefined) await client.query('UPDATE learner SET name=$1, updated_at=now() WHERE id=$2', [body.name.trim(),targetId]);
      if (body.email !== undefined) {
        const email = body.email.trim().toLowerCase();
        const dup = await client.query('SELECT id FROM app_user WHERE lower(email)=lower($1) AND id<>$2', [email,targetId]);
        if (dup.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ code:'EMAIL_EXISTS',message:'Email is already in use.'},{status:409}); }
        await client.query('UPDATE app_user SET email=$1, updated_at=now() WHERE id=$2',[email,targetId]);
      }
      if (body.password !== undefined) {
        if (body.password.length < 8) { await client.query('ROLLBACK'); return NextResponse.json({code:'VALIDATION_ERROR',message:'Password must be at least 8 characters.'},{status:400}); }
        await client.query('UPDATE app_user SET password_hash=$1, updated_at=now() WHERE id=$2',[await hashPassword(body.password),targetId]);
      }
      if (body.role && actor.role === 'SUPER_ADMIN') await client.query('UPDATE app_user SET role=$1, updated_at=now() WHERE id=$2',[body.role,targetId]);
      if (body.status && adminRoles.has(actor.role)) await client.query(`UPDATE app_user SET status=$1, updated_at=now() WHERE id=$2`,[body.status,targetId]);
      await client.query('COMMIT');
      const result = await pool.query(`SELECT u.id,l.name,u.email,u.role,u.status,u.email_verified FROM app_user u JOIN learner l ON l.id=u.id WHERE u.id=$1`,[targetId]);
      return NextResponse.json({ user:result.rows[0] });
    } catch (err) { await client.query('ROLLBACK').catch(()=>{}); throw err; } finally { client.release(); }
  } catch (err) { return NextResponse.json({code:err.code ?? 'USER_UPDATE_FAILED',message:err.message},{status:err.code==='UNAUTHENTICATED'?401:500}); }
}

export async function DELETE(request) {
  try {
    const actor = await requireUser();
    if (!actor) return NextResponse.json({ code:'UNAUTHENTICATED', message:'Login required' }, { status:401 });
    const targetId = new URL(request.url).searchParams.get('id') ?? actor.id;
    if (targetId !== actor.id && !adminRoles.has(actor.role)) return NextResponse.json({code:'FORBIDDEN',message:'Admin access required.'},{status:403});
    if (targetId === actor.id && actor.role === 'SUPER_ADMIN') {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM app_user WHERE role='SUPER_ADMIN' AND status='ACTIVE'`);
      if (rows[0].n <= 1) return NextResponse.json({code:'LAST_SUPER_ADMIN',message:'The last super admin cannot be deleted.'},{status:409});
    }
    await pool.query(`UPDATE app_user SET status='DELETED', email=NULL, password_hash=NULL, updated_at=now() WHERE id=$1`,[targetId]);
    if (targetId === actor.id) await pool.query('DELETE FROM user_session WHERE user_id=$1',[targetId]);
    return NextResponse.json({ deleted:true, id:targetId });
  } catch (err) { return NextResponse.json({code:err.code ?? 'USER_DELETE_FAILED',message:err.message},{status:err.code==='UNAUTHENTICATED'?401:500}); }
}
