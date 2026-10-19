import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth.mjs';
import { createTopic, ContentUploadError } from '../../../../lib/adminContent.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/admin/topics -- create a topic directly under an existing chapter. */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  try {
    const body = await request.json();
    await createTopic({ topicId: body.id, topicName: body.name, chapterId: body.chapterId });
    return NextResponse.json({ id: body.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ContentUploadError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CREATE_FAILED', message: err.message }, { status: 500 });
  }
}
