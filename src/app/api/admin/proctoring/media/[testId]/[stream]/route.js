import { Readable } from 'node:stream';
import { requireAdmin } from '../../../../../../../lib/auth.mjs';
import { getRecordingStats, openRecordingStream } from '../../../../../../../lib/proctoringStorage.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/proctoring/media/:testId/:stream (stream = camera|screen)
 * query: ?download=1 -- forces a browser download (Content-Disposition:
 *   attachment) with a sensible filename, instead of playing inline.
 *
 * Streams the recording file, with HTTP Range support so the <video>
 * player can seek -- without it, browsers can download but not scrub.
 */
export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Admin access required' }), { status: 403 });

  const { testId, stream } = await params;
  if (stream !== 'camera' && stream !== 'screen') {
    return new Response(JSON.stringify({ code: 'BAD_STREAM', message: 'stream must be camera or screen' }), { status: 400 });
  }

  const { exists, size } = await getRecordingStats(testId, stream);
  if (!exists) {
    return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'No recording for this test/stream' }), { status: 404 });
  }

  const download = new URL(request.url).searchParams.get('download');
  const contentDisposition = download ? `attachment; filename="${testId}-${stream}.webm"` : 'inline';

  const rangeHeader = request.headers.get('range');
  if (rangeHeader && !download) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;
    const { nodeStream } = await openRecordingStream(testId, stream, { start, end });

    return new Response(Readable.toWeb(nodeStream), {
      status: 206,
      headers: {
        'Content-Type': 'video/webm',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Content-Disposition': contentDisposition,
      },
    });
  }

  const { nodeStream } = await openRecordingStream(testId, stream);
  return new Response(Readable.toWeb(nodeStream), {
    status: 200,
    headers: {
      'Content-Type': 'video/webm',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(size),
      'Content-Disposition': contentDisposition,
    },
  });
}
