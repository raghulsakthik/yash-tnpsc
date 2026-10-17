import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth.mjs';
import { getSyllabusTree } from '../../../../../lib/adminContent.mjs';
import { extractText, ExtractError } from '../../../../../lib/documentExtract.mjs';
import { renderPdfPageToPng } from '../../../../../lib/pdfRender.mjs';
import { classifyContent, ClassifyError } from '../../../../../lib/ai/contentClassifier.mjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/classify
 * body: { fileBase64: string, fileName: string }
 *
 * Extracts text out of whatever document was uploaded (PDF, .docx, .txt)
 * and asks the AI classifier to split it into MCQs and study-note
 * resources, each matched against the real syllabus. For a PDF, any item
 * the AI flags as diagram-dependent gets that source page rendered to a
 * PNG and attached as `diagramImage` (a data URL) -- the figure the text
 * extractor couldn't carry is kept as a picture instead of being lost.
 * Read-only otherwise -- nothing is written to the database here. The
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

  if (!body.fileBase64 || typeof body.fileBase64 !== 'string') {
    return NextResponse.json({ code: 'MISSING_FILE', message: 'A `fileBase64` field is required' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(body.fileBase64, 'base64');
    const { pages, isPdf } = await extractText(buffer, body.fileName ?? '');

    const syllabusTree = await getSyllabusTree();
    const result = await classifyContent(pages, syllabusTree);

    if (isPdf) {
      const renderedByPage = new Map();
      for (const item of [...result.mcqs, ...result.resources]) {
        if (!item.needsDiagram || !item.sourcePage) continue;
        if (!renderedByPage.has(item.sourcePage)) {
          const png = await renderPdfPageToPng(buffer, item.sourcePage);
          renderedByPage.set(item.sourcePage, png ? `data:image/png;base64,${png.toString('base64')}` : null);
        }
        item.diagramImage = renderedByPage.get(item.sourcePage);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ExtractError || err instanceof ClassifyError) {
      return NextResponse.json({ code: err.code, message: err.message }, { status: 422 });
    }
    return NextResponse.json({ code: 'CLASSIFY_FAILED', message: err.message }, { status: 500 });
  }
}
