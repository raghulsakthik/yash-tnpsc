import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { listAdminAccounts, createAdminAccount, AdminUserError } from '../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users -- every admin account. Requires users.update (viewing the roster is part of managing it). */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const accounts = await listAdminAccounts();
  return NextResponse.json({ accounts });
}

/**
 * POST /api/admin/users
 * body: { email, password, adminRole, subjectIds?: string[] }
 */
export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  try {
    const id = await createAdminAccount({
      email: body.email,
      password: body.password,
      adminRole: body.adminRole,
      subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds : [],
    });
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
