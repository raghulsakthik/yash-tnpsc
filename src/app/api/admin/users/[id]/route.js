import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { updateAdminAccount, deleteAdminAccount, AdminUserError } from '../../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/users/:id
 * body: { adminRole?: string, subjectIds?: string[] }
 */
export async function PUT(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  try {
    await updateAdminAccount(id, { adminRole: body.adminRole, subjectIds: body.subjectIds });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

/** DELETE /api/admin/users/:id */
export async function DELETE(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { id } = await params;
  try {
    await deleteAdminAccount(id, { requestingAccountId: admin.accountId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
