import { NextResponse } from 'next/server';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { generateQuestion, QUICK_LAB_MODES } from '../../../../../domain/quicklab.mjs';
import { createPendingQuestion } from '../../../../../lib/quicklabTokens.mjs';
import { query } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quick-lab/:mode/next
 *
 * Generates one fresh question for the mode -- never pulled from a fixed
 * bank, so there's always a next one. The correct index is kept server-side
 * behind a short-lived token; the client finds out via /submit.
 */
export async function GET(request, { params }) {
  const { mode } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ code: 'NOT_AUTHENTICATED', message: 'No active session' }, { status: 401 });
  }

  if (!QUICK_LAB_MODES.includes(mode)) {
    return NextResponse.json({ code: 'UNKNOWN_MODE', message: `No Quick Lab mode "${mode}"` }, { status: 404 });
  }

  const { rows: modeRows } = await query('SELECT enabled FROM quicklab_mode WHERE mode_key = $1', [mode]);
  if (modeRows.length > 0 && !modeRows[0].enabled) {
    return NextResponse.json({ code: 'MODE_DISABLED', message: `Quick Lab mode "${mode}" is currently disabled` }, { status: 404 });
  }

  const { prompt, revealPrompt, hint, options, correctIndex, memorize } = generateQuestion(mode);
  const token = createPendingQuestion(correctIndex, { learnerId, mode });

  return NextResponse.json({ token, prompt, revealPrompt, hint, options, memorize: Boolean(memorize) });
}
