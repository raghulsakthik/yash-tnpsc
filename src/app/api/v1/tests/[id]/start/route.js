import { NextResponse } from 'next/server';
import { startAdaptiveTest } from '../../../../../../services/adaptiveTestService.mjs';
import { NotFoundError } from '../../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** POST /api/v1/tests/:id/start — DRAFT -> IN_PROGRESS. Idempotent: already-started tests just return current state. */
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const test = await startAdaptiveTest(id);
    return NextResponse.json(test);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_START_FAILED', message: err.message }, { status: 500 });
  }
}
