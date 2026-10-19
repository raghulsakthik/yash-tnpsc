import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/quick-lab/modes -- the real, admin-editable list of enabled modes. */
export async function GET(request) {
  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  const { rows } = await query(
    `SELECT mode_key, display_name, description, recommended
       FROM quicklab_mode WHERE enabled = true ORDER BY sort_order`
  );

  return NextResponse.json({
    modes: rows.map((r) => ({ slug: r.mode_key, name: r.display_name, desc: r.description, recommended: r.recommended })),
  });
}
