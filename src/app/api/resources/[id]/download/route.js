import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requireUser } from '../../../../../lib/auth.mjs';
import { getObject } from '../../../../../lib/objectStorage.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/resources/:id/download -- streams the real stored file, never a generated placeholder. */
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ code: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id } = await params;
  const { rows } = await query(`SELECT title, object_key, content_type FROM resource_file WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return NextResponse.json({ code: 'RESOURCE_NOT_FOUND', message: 'No such resource' }, { status: 404 });
  }
  const { title, object_key: objectKey, content_type: contentType } = rows[0];

  try {
    const buffer = await getObject(objectKey);
    const ext = contentType.includes('pdf') ? '.pdf' : '';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9.\-_ ]/gi, '_')}${ext}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ code: 'RESOURCE_UNAVAILABLE', message: err.message }, { status: 500 });
  }
}
