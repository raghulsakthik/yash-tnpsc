/**
 * Phase 26.2 — PYQ Knowledge Mapping. Pure shaping over real counts the
 * repository layer already aggregated from question/question_attempt
 * (source LIKE 'tnpsc-%', unchanged schema since Phase 1/21) — nothing here
 * queries anything, it only turns rows into the reported shape and attaches
 * the one rule the brief is explicit about: a historical count is a fact
 * about the past, never a promise about the future.
 */

export const FREQUENCY_DISCLAIMER =
  'This is how often this has appeared in the real, seeded past papers — it does not predict or guarantee future appearance.';

/**
 * @param {Array<{topicId: string, topicName: string, chapterId: string, count: number}>} rows
 */
export function buildTopicFrequencyReport(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    totalPyqQuestions: total,
    topics: rows
      .map((r) => ({
        topicId: r.topicId,
        topicName: r.topicName,
        chapterId: r.chapterId,
        count: r.count,
        share: total > 0 ? Math.round((r.count / total) * 1000) / 1000 : 0,
      }))
      .sort((a, b) => b.count - a.count),
    disclaimer: FREQUENCY_DISCLAIMER,
  };
}

/**
 * @param {Array<{subjectId: string, subjectName: string, count: number}>} rows
 */
export function buildSubjectFrequencyReport(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    totalPyqQuestions: total,
    subjects: rows
      .map((r) => ({ ...r, share: total > 0 ? Math.round((r.count / total) * 1000) / 1000 : 0 }))
      .sort((a, b) => b.count - a.count),
    disclaimer: FREQUENCY_DISCLAIMER,
  };
}

/**
 * @param {Array<{year: number, count: number}>} rows
 */
export function buildYearlyTrendReport(rows) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const counts = sorted.map((r) => r.count);
  const average = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  return {
    years: sorted,
    yearsCovered: sorted.length,
    averagePerYear: Math.round(average * 100) / 100,
    disclaimer: 'Year-wise counts reflect only the real papers transcribed into this system so far, not the complete 2011-2025 TNPSC record — a gap year here means untranscribed, not a real zero-question year.',
  };
}

/**
 * @param {Array<{band: string, count: number}>} rows difficulty already bucketed by the repository
 */
export function buildDifficultyDistributionReport(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    totalPyqQuestions: total,
    bands: rows.map((r) => ({ ...r, share: total > 0 ? Math.round((r.count / total) * 1000) / 1000 : 0 })),
  };
}

/**
 * "How frequently has this concept appeared historically?" — the brief's
 * own example question, answered honestly: a real count plus the explicit
 * non-prediction disclaimer, never a bare number.
 *
 * @param {object} input
 * @param {string} input.topicId
 * @param {number} input.count real PYQ question count for this topic
 * @param {Array<{year: number, count: number}>} input.byYear
 */
export function buildConceptFrequencyAnswer({ topicId, count, byYear }) {
  return {
    topicId,
    historicalCount: count,
    byYear: [...byYear].sort((a, b) => a.year - b.year),
    answer:
      count === 0
        ? `No real past-paper question on ${topicId} has been transcribed into this system yet.`
        : `${topicId} has appeared in ${count} real, transcribed past-paper question${count === 1 ? '' : 's'} so far.`,
    disclaimer: FREQUENCY_DISCLAIMER,
  };
}
