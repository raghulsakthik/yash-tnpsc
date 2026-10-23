import { NextResponse } from 'next/server';
import { getPyqYears } from '../../../../../services/pyqCatalogService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/pyq/years — real transcribed years and their question counts. */
export async function GET() {
  try {
    const years = await getPyqYears();
    return NextResponse.json({ years });
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_YEARS_FAILED', message: err.message }, { status: 500 });
  }
}
