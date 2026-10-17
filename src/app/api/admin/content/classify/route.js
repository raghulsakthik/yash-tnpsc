import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { getSyllabusTree } from '../../../../../lib/adminContent.mjs';
import { classifyContent, ClassifyError } from '../../../../../lib/ai/contentClassifier.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/classify
 * body: { pdfBase64: string }
 *
 * Extracts text from the uploaded PDF and asks the AI classifier to split
 * it into MCQs and study-note resources, each matched against the real
 * syllabus. Read-only -- nothing is written to the database here. The
 * admin reviews/edits this proposal in the UI, then calls /commit.
 */
export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'BAD_JSON', message: 'Body is not JSON' }, { status: 400 });
  }

  if (!body.pdfBase64 || typeof body.pdfBase64 !== 'string') {
    return NextResponse.json({ code: 'MISSING_PDF', message: 'A `pdfBase64` field is required' }, { status: 400 });
  }

  try {
    const { PDFParse } = await import('pdf-parse');
    const buffer = Buffer.from(body.pdfBase64, 'base64');
    const parser = new PDFParse({ data: buffer });
    const { pages } = await parser.getText();
    const text = pages.map((p) => p.text).join('\n');

    const syllabusTree = await getSyllabusTree();
    const result = await classifyContent(text, syllabusTree);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ClassifyError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 422 });
    }
    return NextResponse.json({ code: 'CLASSIFY_FAILED', message: err.message }, { status: 500 });
  }
}
