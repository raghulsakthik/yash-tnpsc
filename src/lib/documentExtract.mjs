/**
 * Extracts plain text out of whatever document an admin dropped in --
 * PDF, Word (.docx), or plain text. The one place that knows which parsing
 * library goes with which file extension, so the upload route and the
 * classifier never have to care what kind of file they got.
 */

export class ExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function extensionOf(fileName) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName ?? '');
  return match ? match[1].toLowerCase() : '';
}

/**
 * @param {Buffer} buffer
 * @param {string} fileName
 * @returns {Promise<string>}
 */
export async function extractText(buffer, fileName) {
  const ext = extensionOf(fileName);

  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const { pages } = await parser.getText();
    return pages.map((p) => p.text).join('\n');
  }

  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf8');
  }

  if (ext === 'doc') {
    throw new ExtractError(
      'UNSUPPORTED_FORMAT',
      'Old-style .doc files aren\'t supported -- re-save it as .docx (Word) or .pdf and upload that instead.'
    );
  }

  throw new ExtractError('UNSUPPORTED_FORMAT', `Unsupported file type "${ext || 'unknown'}". Upload a PDF, .docx, or .txt file.`);
}
