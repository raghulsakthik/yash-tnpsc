import { NextResponse } from 'next/server';
import { listInspiredQuestions } from '../../../../../services/inspiredQuestionService.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/question/inspired
 *
 * Phase 26.5's TNPSC-Inspired MCQ Engine: published, AI-generated
 * questions — distinct from real PYQs by construction (generated_question
 * is a separate table). Honestly empty: no AI provider is configured in
 * this environment, so nothing has been generated yet.
 */
export async function GET() {
  try {
    const result = await listInspiredQuestions();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ code: 'INSPIRED_QUESTIONS_FAILED', message: err.message }, { status: 500 });
  }
}
