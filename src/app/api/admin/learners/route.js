import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { findLearnerByEmail } from '../../../../lib/adminUsers.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/learners?email=... -- looks up one learner account by
 * exact email. There's no general learner roster yet (that's a much
 * bigger feature); this exists so an admin can identify a specific
 * account -- e.g. a disposable test/QA account -- before deleting it.
 */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.USERS_DELETE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const email = new URL(request.url).searchParams.get('email');
  if (!email) return NextResponse.json({ code: 'MISSING_EMAIL', message: 'email query param is required' }, { status: 400 });

  const learner = await findLearnerByEmail(email);
  if (!learner) return NextResponse.json({ code: 'NOT_FOUND', message: `No learner account for ${email}` }, { status: 404 });
  return NextResponse.json({ learner });
}
