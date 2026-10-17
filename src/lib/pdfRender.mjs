/**
 * Rasterizes the *diagram region* of one PDF page -- not the whole page --
 * for a question whose answer genuinely depends on a figure the text
 * extractor can't read (a seating chart, a dice net, a cube view). Built
 * on pdfjs-dist + @napi-rs/canvas -- both already ship as pdf-parse's own
 * dependencies, so no new package and, importantly, no system binary
 * (poppler, etc.) that wouldn't exist on a serverless host.
 *
 * Strategy: render the full page once, then use the page's own text
 * layout (pdfjs getTextContent, which gives exact pixel positions) to
 * find where a real diagram actually sits -- it's the vertical gap in
 * the text where there should be a line but isn't, because a drawing
 * occupies that space instead. That gap is located relative to the
 * question's own text line, then trimmed tighter still by scanning the
 * rendered pixels for the real ink bounding box (so blank margin inside
 * the gap doesn't inflate the crop). Falls back to a looser crop, and
 * ultimately to the whole page, rather than ever throwing -- a rendering
 * miss should degrade gracefully, not break the upload.
 */

let pdfjsPromise;
function loadPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

const SCALE = 2.0;
// Ordinary spacing before a new question/paragraph in real documents runs up to
// ~80-90px at this scale; a real diagram's gap is typically 200px+. This sits
// comfortably above the former and below the latter.
const MIN_GAP_PX = 130;
const SEARCH_WINDOW_PX = 1400; // how far below the question's own line to look for its diagram
const PAD_PX = 14;
const WHITE_THRESHOLD = 248; // pixel channel value above which we call it "blank page"

function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Groups text items into visual lines (same rounded baseline y), with pixel top/bottom. */
function buildLines(items, viewport) {
  const byY = new Map();
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const [, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const y = Math.round(vy);
    const heightPx = item.height * viewport.scale;
    if (!byY.has(y)) byY.set(y, { y, items: [], text: '' });
    const line = byY.get(y);
    line.items.push(item);
    line.text += item.str;
    line.height = Math.max(line.height ?? 0, heightPx);
  }
  return [...byY.values()]
    .map((line) => ({
      y: line.y,
      top: line.y - line.height,
      bottom: line.y + line.height * 0.25,
      text: line.text,
    }))
    .sort((a, b) => a.y - b.y);
}

function findQuestionLineIndex(lines, questionText) {
  const needle = normalize(questionText).slice(0, 40);
  if (!needle) return -1;
  return lines.findIndex((line) => {
    const text = normalize(line.text);
    // A short section heading ("DICE") is trivially a substring of almost
    // any question -- only let the reverse match count for lines with
    // enough of their own text to be a real match, not a stray word.
    return text.includes(needle) || (text.length >= 15 && needle.includes(text));
  });
}

/**
 * Finds every real diagram-sized gap on the page (a gap between
 * consecutive lines too big to be ordinary paragraph spacing), then
 * returns whichever gap sits closest to the question's own line -- above
 * or below. A diagram often precedes the question(s) that use it (a
 * shared setup figure for several questions) just as often as it follows
 * one (a "Solution:" scratch diagram for that question alone), so
 * searching only forward misses the shared-figure case entirely.
 */
const FOOTER_LINE_RE = /^page\s*\d+$/i;

function findDiagramGap(lines, startIndex) {
  const anchor = lines[startIndex].top;
  const gaps = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    const top = lines[i].bottom;
    const bottom = lines[i + 1].top;
    const size = bottom - top;
    // A gap sitting right before the page-number footer is just bottom-of-
    // page whitespace, not a diagram -- without this, that whitespace can
    // end up numerically "closer" to a late question than its real,
    // farther-away shared diagram, and win by pure distance.
    if (FOOTER_LINE_RE.test(normalize(lines[i + 1].text))) continue;
    if (size >= MIN_GAP_PX) gaps.push({ top, bottom });
  }

  let best = null;
  let bestDistance = Infinity;
  for (const gap of gaps) {
    const distance = gap.top >= anchor ? gap.top - anchor : anchor - gap.bottom;
    if (distance > SEARCH_WINDOW_PX) continue;
    if (distance < bestDistance) {
      best = gap;
      bestDistance = distance;
    }
  }
  return best;
}

/** Scans pixel data within a vertical band for the tight ink bounding box. */
function tightenToInk(ctx, canvasWidth, top, bottom) {
  const y0 = Math.max(0, Math.floor(top));
  const y1 = Math.min(ctx.canvas.height, Math.ceil(bottom));
  if (y1 - y0 < 4) return null;

  const { data } = ctx.getImageData(0, y0, canvasWidth, y1 - y0);
  let minX = canvasWidth;
  let maxX = 0;
  let minY = y1 - y0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < y1 - y0; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      const idx = (y * canvasWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return null;
  return { left: minX, right: maxX, top: y0 + minY, bottom: y0 + maxY };
}

async function cropCanvas(canvas, box) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const out = createCanvas(width, height);
  out.getContext('2d').drawImage(canvas, box.left, box.top, width, height, 0, 0, width, height);
  return out.encode('png');
}

/**
 * @param {Buffer} buffer the original PDF file
 * @param {number} pageNumber 1-based
 * @param {string} questionText used to locate this question's own line on the page
 * @returns {Promise<Buffer|null>} PNG bytes, cropped as tightly as the heuristic
 *   can manage (falling back to a looser or whole-page crop), or null if
 *   rendering failed outright.
 */
export async function renderPdfDiagramToPng(buffer, pageNumber, questionText) {
  try {
    const [pdfjsLib, { createCanvas }] = await Promise.all([loadPdfjs(), import('@napi-rs/canvas')]);

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    if (pageNumber < 1 || pageNumber > doc.numPages) return null;

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const content = await page.getTextContent();
    const lines = buildLines(content.items, viewport);
    const startIndex = findQuestionLineIndex(lines, questionText);

    let band = null;
    if (startIndex >= 0) {
      band = findDiagramGap(lines, startIndex);
    }
    // No text anchor, or no real gap found near it -- fall back to the
    // question's immediate surroundings rather than the whole page.
    if (!band) {
      const top = startIndex >= 0 ? lines[startIndex].top : 0;
      band = { top, bottom: Math.min(canvas.height, top + SEARCH_WINDOW_PX) };
    }

    const ink = tightenToInk(ctx, canvas.width, band.top, band.bottom);
    const box = ink
      ? {
          left: Math.max(0, ink.left - PAD_PX),
          right: Math.min(canvas.width, ink.right + PAD_PX),
          top: Math.max(0, ink.top - PAD_PX),
          bottom: Math.min(canvas.height, ink.bottom + PAD_PX),
        }
      : { left: 0, right: canvas.width, top: Math.max(0, band.top - PAD_PX), bottom: Math.min(canvas.height, band.bottom + PAD_PX) };

    if (box.right - box.left < 20 || box.bottom - box.top < 20) {
      // Degenerate crop -- whole page is still more useful than nothing.
      return await canvas.encode('png');
    }

    return await cropCanvas(canvas, box);
  } catch {
    return null;
  }
}

/**
 * Whole-page render, kept for callers that genuinely want the full page
 * (or as an explicit fallback path).
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
