import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { findLearnerByEmail, findLearnersByEmailPrefix } from '../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/learners?email=... -- looks up one learner account by
 * exact email. GET /api/admin/learners?prefix=... finds up to 50 whose
 * email starts with it, for cleaning up a batch of disposable test/QA
 * accounts registered under a shared prefix whose individual emails
 * weren't recorded. There's no general learner roster yet (that's a much
 * bigger feature) -- this exists so an admin can identify account(s)
 * before deleting them.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const prefix = searchParams.get('prefix');

  if (prefix) {
    const learners = await findLearnersByEmailPrefix(prefix);
    return NextResponse.json({ learners });
  }

  if (!email) return NextResponse.json({ code: 'MISSING_EMAIL', message: 'email or prefix query param is required' }, { status: 400 });

  const learner = await findLearnerByEmail(email);
  if (!learner) return NextResponse.json({ code: 'NOT_FOUND', message: `No learner account for ${email}` }, { status: 404 });
  return NextResponse.json({ learner });
}
