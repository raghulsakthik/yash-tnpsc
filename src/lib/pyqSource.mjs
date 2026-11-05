const STRONG_FILENAME = /\b(?:pyq|previous[\s_-]*year|question[\s_-]*paper|question[\s_-]*booklet|original[\s_-]*question[\s_-]*paper)\b/i;
const STRONG_DOCUMENT = /\b(?:previous[\s_-]*year[\s_-]*question[\s_-]*paper|question[\s_-]*booklet[\s_-]*no\.?|question[\s_-]*paper[\s_-]*code|TNPSC\s+(?:CCS|Group\s*(?:II|2))[\s\S]{0,80}(?:question\s+booklet|question\s+paper))\b/i;

/**
 * Detect source documents that contain official/previous-year questions.
 * These documents may be retained as PYQ evidence, but must not be converted
 * into ordinary learner MCQs or generated study notes by the upload flow.
 */
export function detectPyqSource(fileName = '', text = '') {
  const name = String(fileName ?? '');
  const sample = String(text ?? '').slice(0, 20_000);
  if (STRONG_FILENAME.test(name)) {
    return { isPyq: true, confidence: 0.99, reason: 'pyq-filename-marker' };
  }
  if (STRONG_DOCUMENT.test(sample)) {
    return { isPyq: true, confidence: 0.95, reason: 'official-question-booklet-marker' };
  }
  return { isPyq: false, confidence: 0, reason: null };
}
