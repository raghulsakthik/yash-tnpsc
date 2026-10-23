import { NextResponse } from 'next/server';
import { getAdaptiveTest } from '../../../../../services/adaptiveTestService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/tests/:id — the test's current state (not in the brief's literal API list, but needed to render one at all). */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const test = await getAdaptiveTest(id);
    return NextResponse.json(test);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'TEST_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'ADAPTIVE_TEST_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
