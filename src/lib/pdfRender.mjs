/**
 * Rasterizes one page of a PDF to a PNG, for the rare question whose
 * answer genuinely depends on a diagram the text extractor can't read
 * (a seating chart, a dice net, a cube view). Built on pdfjs-dist +
 * @napi-rs/canvas -- both already ship as pdf-parse's own dependencies,
 * so no new package and, importantly, no system binary (poppler, etc.)
 * that wouldn't exist on a serverless host.
 *
 * Deliberately best-effort: any failure returns null rather than
 * throwing, so a rendering hiccup degrades to "no diagram image" instead
 * of breaking the whole upload.
 */

let pdfjsPromise;
function loadPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

/**
 * @param {Buffer} buffer the original PDF file
 * @param {number} pageNumber 1-based
 * @param {number} scale render scale (higher = sharper but bigger)
 * @returns {Promise<Buffer|null>} PNG bytes, or null if rendering failed
 */
export async function renderPdfPageToPng(buffer, pageNumber, scale = 1.6) {
  try {
    const [pdfjsLib, { createCanvas }] = await Promise.all([loadPdfjs(), import('@napi-rs/canvas')]);

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    if (pageNumber < 1 || pageNumber > doc.numPages) return null;

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    return await canvas.encode('png');
  } catch {
    return null;
  }
}
