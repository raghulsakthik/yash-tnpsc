import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { deleteLearnerAccount, AdminUserError } from '../../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/learners/:id -- permanently deletes a learner account
 * and everything tied to it (attempts, bookmarks, notes, sessions, ...).
 * Scoped to role = 'STUDENT' only; an admin account can't be removed
 * through this route (use /api/admin/users/:id for that).
 */
export async function DELETE(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { id } = await params;
  try {
    await deleteLearnerAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
