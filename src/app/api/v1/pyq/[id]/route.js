import { NextResponse } from 'next/server';
import { getPyqQuestion } from '../../../../../services/pyqCatalogService.mjs';
import { NotFoundError } from '../../../../../services/errors.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/pyq/:id — a single real, transcribed past-paper question. */
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const question = await getPyqQuestion(id);
    return NextResponse.json(question);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ code: 'PYQ_NOT_FOUND', message: err.message }, { status: 404 });
    }
    return NextResponse.json({ code: 'PYQ_FETCH_FAILED', message: err.message }, { status: 500 });
  }
}
