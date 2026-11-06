import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../../../lib/permissions.mjs';

export const dynamic = 'force-dynamic';
const retrievalUrl = process.env.RETRIEVAL_ENGINE_URL || 'http://127.0.0.1:8000';

export async function GET(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ code: 'BAD_RESOURCE_ID', message: 'Invalid retrieval resource id' }, { status: 400 });
  }
  try {
    const response = await fetch(retrievalUrl + '/api/extract/resource/' + id + '/preview?max_pages=12', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { code: 'MCQ_PREVIEW_FAILED', message: data.detail || data.message || ('Retrieval engine returned ' + response.status) },
        { status: response.status === 404 ? 404 : 502 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ code: 'RETRIEVAL_UNAVAILABLE', message: error.message }, { status: 502 });
  }
}
