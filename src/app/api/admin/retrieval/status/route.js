import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { getRetrievalEngineStatus, listRetrievalResources, retrievalEngineConfigured } from '../../../../../lib/retrievalEngine.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  if (!retrievalEngineConfigured) {
    return NextResponse.json(
      { code: 'RETRIEVAL_ENGINE_NOT_CONFIGURED', message: 'RETRIEVAL_ENGINE_URL is not set on the server' },
      { status: 503 }
    );
  }

  try {
    const [engine, resources] = await Promise.all([getRetrievalEngineStatus(), listRetrievalResources()]);
    return NextResponse.json({ ...engine, resources });
  } catch (err) {
    return NextResponse.json({ code: 'RETRIEVAL_ENGINE_UNREACHABLE', message: err.message }, { status: 502 });
  }
}
