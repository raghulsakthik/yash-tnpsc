import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth.mjs';
import { listReportsForQuestion, resolveReportsForQuestion } from '../../../../../../lib/contentReports.mjs';
import { getQuestion, updateQuestion } from '../../../../../../lib/adminCrud.mjs';

export const dynamic = 'force-dynamic';

/** GET /api/admin/content/support/:questionId -- the full question plus every report on it, for the detail view. */
export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { questionId } = await params;
  const question = await getQuestion(questionId);
  if (!question) return NextResponse.json({ code: 'QUESTION_NOT_FOUND', message: `No question ${questionId}` }, { status: 404 });

  const reports = await listReportsForQuestion(questionId);
  return NextResponse.json({ question, reports });
}

/**
 * POST /api/admin/content/support/:questionId
 * body: {
 *   resolution: string,            -- required, shown to whoever reads the report history later
 *   dismiss?: boolean,              -- true = "not actually wrong", false (default) = a real fix was made
 *   correction?: {                  -- optional: apply a fix to the question itself while resolving
 *     answerIndex?, explanation?, options?, prompt?, trap?
 *   }
 * }
 */
export async function POST(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const { questionId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!body.resolution || typeof body.resolution !== 'string') {
    return NextResponse.json({ code: 'MISSING_RESOLUTION', message: 'A resolution note is required' }, { status: 400 });
  }

  try {
    if (body.correction && typeof body.correction === 'object') {
      await updateQuestion(questionId, body.correction);
    }

    const result = await resolveReportsForQuestion({
      questionId,
      resolution: body.resolution,
      dismiss: Boolean(body.dismiss),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'RESOLVE_FAILED', message: err.message }, { status: 500 });
  }
}
