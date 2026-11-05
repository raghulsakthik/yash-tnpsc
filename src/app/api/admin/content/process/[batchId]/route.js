import { NextResponse, after } from 'next/server';
import { requirePermission } from '../../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../../lib/permissions.mjs';
import { getProcessingBatch, processBatch } from '../../../../../../lib/contentProcessing.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_READ);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { batchId } = await params;
  const batch = await getProcessingBatch(batchId, admin.accountId);
  if (!batch) return NextResponse.json({ code: 'NOT_FOUND', message: 'Processing batch not found.' }, { status: 404 });
  return NextResponse.json(batch);
}

export async function POST(request, { params }) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { batchId } = await params;
  const batch = await getProcessingBatch(batchId, admin.accountId);
  if (!batch) return NextResponse.json({ code: 'NOT_FOUND', message: 'Processing batch not found.' }, { status: 404 });
  after(async () => { await processBatch(batchId); });
  return NextResponse.json({ batchId, status: 'PROCESSING' }, { status: 202 });
}
