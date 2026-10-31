import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { checkRateLimit } from '../../../../../lib/rateLimit.mjs';
import { createProcessingBatch, ContentProcessingError } from '../../../../../lib/contentProcessing.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const allowed = new Set(['.pdf', '.docx', '.txt', '.md']);

export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const rate = await checkRateLimit({ key: `content-process:${admin.accountId}`, limit: 20, windowSeconds: 60 });
  if (!rate.allowed) return NextResponse.json({ code: 'RATE_LIMITED', message: 'Too many content-processing requests.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  try {
    const body = await request.json();
    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) return NextResponse.json({ code: 'NO_FILES', message: 'At least one file is required.' }, { status: 400 });
    const normalized = files.map((file) => {
      const fileName = String(file.fileName ?? 'upload').trim();
      const dot = fileName.lastIndexOf('.');
      const ext = dot >= 0 ? fileName.toLowerCase().slice(dot) : '';
      if (!allowed.has(ext)) throw new ContentProcessingError('UNSUPPORTED_FILE', `${fileName}: supported files are PDF, DOCX, TXT and MD.`);
      if (typeof file.fileBase64 !== 'string') throw new ContentProcessingError('MISSING_FILE', `${fileName}: fileBase64 is required.`);
      const data = Buffer.from(file.fileBase64, 'base64');
      if (!data.length) throw new ContentProcessingError('EMPTY_FILE', `${fileName}: file is empty.`);
      if (data.length > MAX_FILE_BYTES) throw new ContentProcessingError('FILE_TOO_LARGE', `${fileName}: maximum upload size is 25 MB.`);
      return { fileName, mimeType: file.mimeType ?? null, sourceYear: Number.isInteger(file.sourceYear) ? file.sourceYear : null, examCode: file.examCode ?? null, examGroup: file.examGroup ?? null, paper: file.paper ?? null, data };
    });
    const batchId = await createProcessingBatch({ adminId: admin.accountId, files: normalized });
    return NextResponse.json({ batchId, status: 'QUEUED', fileCount: normalized.length }, { status: 202 });
  } catch (err) {
    if (err instanceof ContentProcessingError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'PROCESSING_QUEUE_FAILED', message: err.message }, { status: 500 });
  }
}
