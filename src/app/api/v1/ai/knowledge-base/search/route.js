import { NextResponse } from 'next/server';
import { searchKnowledgeBase } from '../../../../../../services/aiKnowledgeBaseService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai/knowledge-base/search?q=...
 *
 * Phase 29.1's retrieval layer: real, keyword-ranked search over real,
 * approved content — see the response's own disclaimer for why this is
 * not embedding-based semantic search in this environment.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q) return NextResponse.json({ code: 'MISSING_QUERY', message: 'q is required' }, { status: 400 });

  try {
    const result = await searchKnowledgeBase(q);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'KNOWLEDGE_BASE_SEARCH_FAILED', message: err.message }, { status: 500 });
  }
}
