import { NextResponse } from 'next/server';
import { requireAdmin, requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { recordAdminAudit, listAdminAudit } from '../../../../lib/adminCrud.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit-log?limit=100 -- the real admin activity trail
 * (see adminCrud.mjs recordAdminAudit/listAdminAudit). Requires audit.read,
 * same as the rest of the app's audit-reading surface.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.AUDIT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const limit = new URL(request.url).searchParams.get('limit');
    return NextResponse.json({ entries: await listAdminAudit(limit) });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/audit-log
 * body: { action, entity, entityId?, reason?, beforeSnapshot?, afterSnapshot?, result? }
 *
 * Records one entry for an action the caller already performed elsewhere
 * (each of those real actions is independently permission-checked at its
 * own endpoint) -- any signed-in admin can log their own activity. Never
 * allowed to fail the action it's describing: the Admin Portal fires this
 * fire-and-forget after the real write already succeeded.
 */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }
  if (!body.action || !body.entity) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: 'action and entity are required' }, { status: 400 });
  }

  try {
    await recordAdminAudit({
      actorId: admin.accountId,
      actorRole: admin.adminRole || admin.role,
      action: body.action,
      entity: body.entity,
      entityId: body.entityId,
      reason: body.reason,
      beforeSnapshot: body.beforeSnapshot,
      afterSnapshot: body.afterSnapshot,
      result: body.result,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ code: 'AUDIT_WRITE_FAILED', message: err.message }, { status: 500 });
  }
}
