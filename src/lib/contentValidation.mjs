import crypto from 'crypto';

// Same normalization adminContent.mjs/seed.mjs use for normalized_hash --
// one canonical definition of "the same question" shared by every content
// path (manual upload, PDF extraction, template generation).
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizedHash(promptText) {
  return crypto.createHash('sha256').update(normalize(promptText)).digest('hex');
}

/**
 * Scores one candidate question against six weighted checks, mirroring the
 * quality-score breakdown an admin would use to decide whether something's
 * ready to publish. Template-generated questions are mathematically
 * correct by construction (the solver IS the answer), so `correctness`
 * here checks the candidate's internal consistency (answer index valid,
 * options well-formed) rather than re-deriving the math -- the actual
 * arithmetic guarantee comes from the template's solver function, not
 * from this pass.
 *
 * @param {object} q candidate question fields (prompt, options, answerIndex, explanation, topicExists, difficulty)
 * @param {Set<string>} existingHashes normalized_hash values already in the DB for this language
 * @returns {{score: number, breakdown: object, passed: boolean, hash: string}}
 */
export function validateQuestion(q, existingHashes) {
  const breakdown = {};

  // Correctness (30%): well-formed answer, distinct options, answer in range.
  const optionsDistinct = new Set(q.options.map(String)).size === q.options.length;
  const answerValid = Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length;
  breakdown.correctness = optionsDistinct && answerValid ? 1 : 0;

  // Syllabus match (20%): the topic this question claims to belong to is real.
  breakdown.syllabusMatch = q.topicExists ? 1 : 0;

  // Difficulty (15%): a valid 0..1 value was assigned, not left guessed.
  breakdown.difficulty = typeof q.difficulty === 'number' && q.difficulty >= 0 && q.difficulty <= 1 ? 1 : 0;

  // Clarity (15%): a non-trivial prompt and a real explanation, nothing truncated or empty.
  breakdown.clarity = q.prompt?.length > 10 && q.explanation?.length > 15 ? 1 : 0.5;

  // Pattern match (10%): at least 3 options (TNPSC MCQs run 4), estimated time set.
  breakdown.patternMatch = q.options.length >= 3 && q.estimatedSeconds > 0 ? 1 : 0.5;

  // Uniqueness (10%): not a hash collision with something already published.
  const hash = normalizedHash(q.prompt);
  breakdown.uniqueness = existingHashes.has(hash) ? 0 : 1;

  const score =
    breakdown.correctness * 0.3 +
    breakdown.syllabusMatch * 0.2 +
    breakdown.difficulty * 0.15 +
    breakdown.clarity * 0.15 +
    breakdown.patternMatch * 0.1 +
    breakdown.uniqueness * 0.1;

  // Correctness, syllabus match and uniqueness are hard gates, not just
  // weighted inputs -- a malformed answer or an exact duplicate must never
  // pass just because the other four checks scored well (a duplicate can
  // still clear 0.9/1.0 on a weighted sum, and would then crash the DB's
  // own normalized_hash unique constraint on insert instead of being
  // caught here, where the reason is legible).
  const hardGatesPass = breakdown.correctness === 1 && breakdown.syllabusMatch === 1 && breakdown.uniqueness === 1;

  return { score: Math.round(score * 1000) / 1000, breakdown, passed: hardGatesPass && score >= 0.8, hash };
}
