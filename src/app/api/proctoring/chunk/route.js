import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { recordChunk, ProctoringError } from '../../../../lib/proctoring.mjs';
import { appendChunk } from '../../../../lib/proctoringStorage.mjs';

export const dynamic = 'force-dynamic';

const MAX_CHUNK_BYTES = 10 * 1024 * 1024; // 10MB -- a few seconds of video at a time, never a whole session in one request

/**
 * POST /api/proctoring/chunk?testId=...&stream=camera|screen
 * body: raw video bytes (one MediaRecorder ondataavailable chunk)
 *
 * The browser posts small chunks every few seconds rather than one big
 * blob at the end, so a crashed tab or a lost connection only loses the
 * last few seconds, not the whole recording.
 */
export async function POST(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });

  const url = new URL(request.url);
  const testId = url.searchParams.get('testId');
  const stream = url.searchParams.get('stream');
  if (!testId || (stream !== 'camera' && stream !== 'screen')) {
    return NextResponse.json({ code: 'BAD_PARAMS', message: 'testId and stream=camera|screen are required' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) return NextResponse.json({ code: 'EMPTY_CHUNK', message: 'Empty chunk' }, { status: 400 });
    if (buffer.length > MAX_CHUNK_BYTES) return NextResponse.json({ code: 'CHUNK_TOO_LARGE', message: 'Chunk too large' }, { status: 413 });

    await recordChunk(testId, learnerId, stream); // also verifies test ownership
    await appendChunk(testId, stream, buffer);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProctoringError) return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    return NextResponse.json({ code: 'CHUNK_FAILED', message: err.message }, { status: 500 });
  }
}
