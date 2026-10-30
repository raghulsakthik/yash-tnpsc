import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { triggerCatalogDiscovery, retrievalEngineConfigured } from '../../../../../lib/retrievalEngine.mjs';

export const dynamic = 'force-dynamic';

// Triggers the retrieval engine's own TNPSC catalog discovery pass. The
// engine itself refuses to do anything if its browser session isn't
// authenticated (see engines/retrieval/app/api/discovery_routes.py --
// {authenticated:false, courses:[], resources:0} rather than attempting a
// login or bypassing the portal's own access controls) -- this route is
// just a thin authenticated pass-through to that existing safety gate, not
// a new capability.
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  if (!retrievalEngineConfigured) {
    return NextResponse.json(
      { code: 'RETRIEVAL_ENGINE_NOT_CONFIGURED', message: 'RETRIEVAL_ENGINE_URL is not set on the server' },
      { status: 503 }
    );
  }

  try {
    const result = await triggerCatalogDiscovery();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'RETRIEVAL_ENGINE_UNREACHABLE', message: err.message }, { status: 502 });
  }
}
