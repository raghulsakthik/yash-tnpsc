import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { findLearnerByEmail, findLearnersByEmailPrefix, listLearners, createLearnerAccount, AdminUserError } from '../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/learners?email=... -- looks up one learner account by
 * exact email. GET /api/admin/learners?prefix=... finds up to 50 whose
 * email starts with it (for cleaning up a batch of disposable test/QA
 * accounts under a shared prefix). GET /api/admin/learners with neither --
 * optionally ?search=&limit=&offset= -- is the real paginated roster for
 * the Admin Portal's Learners section.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_UPDATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const prefix = searchParams.get('prefix');

  if (prefix) {
    const learners = await findLearnersByEmailPrefix(prefix);
    return NextResponse.json({ learners });
  }

  if (email) {
    const learner = await findLearnerByEmail(email);
    if (!learner) return NextResponse.json({ code: 'NOT_FOUND', message: `No learner account for ${email}` }, { status: 404 });
    return NextResponse.json({ learner });
  }

  const result = await listLearners({
    search: searchParams.get('search'),
    limit: searchParams.get('limit'),
    offset: searchParams.get('offset'),
  });
  return NextResponse.json(result);
}

/**
 * POST /api/admin/learners
 * body: { name, email, phone? }
 *
 * The Admin Portal's "Add Learner" modal, previously a local-only row.
 * Returns a generated temporary password once -- there's no email-delivery
 * path for account creation yet, so the admin relays it directly.
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
    const result = await createLearnerAccount({ name: body.name, email: body.email, phone: body.phone });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
