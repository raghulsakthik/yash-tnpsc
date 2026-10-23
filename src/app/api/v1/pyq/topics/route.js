import { NextResponse } from 'next/server';
import { getPyqTopics } from '../../../../../services/pyqCatalogService.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/v1/pyq/topics — real topics with transcribed PYQ content, most-covered first. */
export async function GET() {
  try {
    const topics = await getPyqTopics();
    return NextResponse.json({ topics });
  } catch (err) {
    return NextResponse.json({ code: 'PYQ_TOPICS_FAILED', message: err.message }, { status: 500 });
  }
}
