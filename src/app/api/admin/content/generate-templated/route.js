import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { generateTemplatedBatch, TemplateGenerationError, TEMPLATES } from '../../../../../lib/questionTemplates/index.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/generate-templated
 * body: { templateId: string, count: number }
 *
 * Parameterized question templates with a deterministic solver -- the
 * answer is computed by the template, never guessed by an AI model, so
 * there's no class of "AI-generated MCQ has a wrong answer" bug possible
 * here. Everything lands as DRAFT in a review batch; nothing is visible to
 * a learner until GET .../review lists it and an admin approves it.
 */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  const { templateId, count } = body;
  if (!templateId || typeof templateId !== 'string') {
    return NextResponse.json({ code: 'MISSING_TEMPLATE', message: 'A `templateId` is required.' }, { status: 400 });
  }
  const n = Number.isInteger(count) ? count : 10;
  if (n < 1 || n > 50) {
    return NextResponse.json({ code: 'INVALID_COUNT', message: 'count must be between 1 and 50.' }, { status: 400 });
  }

  try {
    const result = await generateTemplatedBatch(templateId, n);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TemplateGenerationError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 400 });
    }
    return NextResponse.json({ code: 'GENERATE_FAILED', message: err.message }, { status: 500 });
  }
}

/** GET /api/admin/content/generate-templated -- lists available templates. */
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

  const templates = Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    topicId: t.topicId,
    subtopic: t.subtopic,
    questionType: t.questionType,
    skillsRequired: t.skillsRequired,
  }));
  return NextResponse.json({ templates });
}
