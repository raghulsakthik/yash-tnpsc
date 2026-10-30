import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../../lib/permissions.mjs';
import { query } from '../../../../../lib/db.mjs';
import { registerSourceDocument, gcsConfigured } from '../../../../../lib/gcs.mjs';

export const dynamic = 'force-dynamic';

// Registers a GCS-backed source document already uploaded by the retrieval
// or labelling engine (this platform never uploads source material itself
// -- see infra/gcs/provision.sh's IAM matrix). The row is the database's
// side of the "system of record" split: GCS holds the bytes, this table
// holds the metadata content_engine_lineage.source_ids points at.
export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content import permission required' }, { status: 403 });

  if (!gcsConfigured) {
    return NextResponse.json(
      { code: 'GCS_NOT_CONFIGURED', message: 'GCS_SERVICE_ACCOUNT_JSON/GCS_BUCKET are not set on the server' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const required = ['id', 'bucket', 'objectName', 'generation', 'sha256', 'mimeType', 'byteSize'];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '');
  if (missing.length) {
    return NextResponse.json({ code: 'MISSING_FIELDS', message: `Missing: ${missing.join(', ')}` }, { status: 400 });
  }
  if (!/^[a-f0-9]{64}$/i.test(String(body.sha256))) {
    return NextResponse.json({ code: 'INVALID_SHA256', message: 'sha256 must be a 64-character hex string' }, { status: 400 });
  }

  try {
    const doc = await registerSourceDocument({
      id: String(body.id),
      bucket: String(body.bucket),
      objectName: String(body.objectName),
      generation: String(body.generation),
      sha256: String(body.sha256).toLowerCase(),
      mimeType: String(body.mimeType),
      byteSize: Number(body.byteSize),
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : undefined,
      examCode: body.examCode ? String(body.examCode) : undefined,
      isPyq: Boolean(body.isPyq),
      registeredBy: admin.accountId ?? 'unknown',
    });
    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
  } catch (err) {
    if (err.code === '23505') {
      return NextResponse.json({ code: 'ALREADY_REGISTERED', message: 'This exact bucket/object/generation is already registered' }, { status: 409 });
    }
    return NextResponse.json({ code: 'REGISTER_FAILED', message: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Content import permission required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const status = searchParams.get('status');

  const { rows } = status
    ? await query(
        `SELECT id, bucket, object_name, generation, sha256, mime_type, byte_size, exam_code, is_pyq, status, created_at
         FROM content_engine_source_document WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
        [status, limit]
      )
    : await query(
        `SELECT id, bucket, object_name, generation, sha256, mime_type, byte_size, exam_code, is_pyq, status, created_at
         FROM content_engine_source_document ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );

  return NextResponse.json({ documents: rows });
}
