import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { getSyllabusTree } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/syllabus -- the real subject/chapter/topic tree, for the upload form's pickers. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  }

  try {
    const subjects = await getSyllabusTree();
    return NextResponse.json({ subjects });
  } catch (err) {
    return NextResponse.json({ code: 'SYLLABUS_FAILED', message: err.message }, { status: 500 });
  }
}
