import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../lib/auth.mjs';
import { PERMISSIONS } from '../../../../lib/permissions.mjs';
import { query } from '../../../../lib/db.mjs';
import { putObject } from '../../../../lib/objectStorage.mjs';

export const dynamic = 'force-dynamic';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * POST /api/admin/resources
 * body: { title, description?, category?, fileName, mimeType, fileBase64 }
 *
 * Admin-uploaded real resource file for learners to download -- stored
 * through the same object storage every content-ingestion upload uses,
 * never a client-generated placeholder.
 */
export async function POST(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ code: 'BAD_JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ code: 'MISSING_TITLE', message: 'A title is required.' }, { status: 400 });
  if (typeof body.fileBase64 !== 'string' || !body.fileBase64) {
    return NextResponse.json({ code: 'MISSING_FILE', message: 'fileBase64 is required.' }, { status: 400 });
  }
  const data = Buffer.from(body.fileBase64, 'base64');
  if (!data.length) return NextResponse.json({ code: 'EMPTY_FILE', message: 'File is empty.' }, { status: 400 });
  if (data.length > MAX_FILE_BYTES) return NextResponse.json({ code: 'FILE_TOO_LARGE', message: 'Maximum upload size is 25 MB.' }, { status: 400 });

  const objectKey = `resources/${crypto.randomUUID()}-${String(body.fileName ?? 'file').replace(/[^a-z0-9.\-_]/gi, '_')}`;
  try {
    await putObject(objectKey, data, body.mimeType || 'application/octet-stream');
    const { rows } = await query(
      `INSERT INTO resource_file (title, description, category, object_key, content_type, size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [title, body.description ?? null, body.category || 'General', objectKey, body.mimeType || 'application/octet-stream', data.length, admin.accountId]
    );
    return NextResponse.json({ id: rows[0].id, title, sizeBytes: data.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ code: 'RESOURCE_UPLOAD_FAILED', message: err.message }, { status: 500 });
  }
}

/** GET /api/admin/resources -- admin listing with delete affordance. */
export async function GET(request) {
  const admin = await requirePermission(request, PERMISSIONS.CONTENT_CREATE);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  const { rows } = await query(`SELECT id, title, description, category, content_type, size_bytes, created_at FROM resource_file ORDER BY created_at DESC`);
  return NextResponse.json({ resources: rows });
}
