import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { listSubjects, createSubject } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    return NextResponse.json({ subjects: await listSubjects() });
  } catch (err) {
    return NextResponse.json({ code: 'LIST_FAILED', message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    await createSubject(body);
    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
