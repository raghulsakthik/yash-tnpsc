import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { createChapter } from '../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    await createChapter(body);
    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
