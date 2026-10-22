import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { updateTestTemplate, deleteTestTemplate } from '../../../../../../lib/adminCrud.mjs';
import { ContentUploadError } from '../../../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    await updateTestTemplate(id, await request.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'UPDATE_FAILED', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { id } = await params;
  try {
    await deleteTestTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'DELETE_FAILED', message: err.message }, { status: 500 });
  }
}
