const normalize = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .normalize('NFKC')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const ANSWER_MARKER = /^\s*(?:ans(?:wer)?|correct\s+option|key)\s*[:.)-]\s*[\[(]?([A-E])[\])]?\s*$/im;

function sourceAnswer(pageText, candidateCountOnPage) {
  // A generic "Answer: B" can only be attributed safely when that page
  // contains exactly one extracted question and exactly one answer marker.
  // Multi-question answer keys need question-number-aware parsing or review.
  if (candidateCountOnPage !== 1) return null;
  const matches = [...String(pageText ?? '').matchAll(new RegExp(ANSWER_MARKER.source, `${ANSWER_MARKER.flags}g`))];
  if (matches.length !== 1) return null;
  return matches[0][1].toUpperCase().charCodeAt(0) - 65;
}

function tokenOverlap(left, right) {
  const a = new Set(normalize(left).split(' ').filter((x) => x.length > 2));
  const b = new Set(normalize(right).split(' ').filter((x) => x.length > 2));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / a.size;
}

/**
 * Deterministic quality gate for AI-extracted content.
 * It does not certify factual correctness and never approves publication.
 * Every candidate remains in the human review queue.
 */
export function evaluateClassifiedContent({ pages = [], result = {}, syllabusTree = [] }) {
  const pageMap = new Map(pages.map((page) => [page.pageNumber, page.text ?? '']));
  const topicIds = new Set(
    syllabusTree.flatMap((subject) =>
      (subject.chapters ?? []).flatMap((chapter) =>
        (chapter.topics ?? []).map((topic) => topic.id)
      )
    )
  );

  const mcqs = (result.mcqs ?? []).map((item) => {
    const issues = [];
    const pageText = pageMap.get(item.sourcePage);
    const options = Array.isArray(item.options) ? item.options : [];
    const distinctOptions = new Set(options.map(normalize));
    const answerIndex = item.answerIndex;
    if (!item.topicId || !topicIds.has(item.topicId)) issues.push('TOPIC_NOT_CONFIRMED');
    if (!Number.isInteger(item.sourcePage) || !pageMap.has(item.sourcePage)) issues.push('SOURCE_PAGE_NOT_CONFIRMED');
    if (options.length < 2 || options.length > 6 || distinctOptions.size !== options.length) issues.push('OPTIONS_INVALID');
    if (answerIndex === null || answerIndex === undefined) issues.push('ANSWER_INDEX_MISSING');
    else if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) issues.push('ANSWER_INDEX_INVALID');
    if (String(item.explanation ?? '').trim().length < 16) issues.push('EXPLANATION_TOO_SHORT');
    if (typeof item.confidence !== 'number' || item.confidence < 0.8) issues.push('LOW_CLASSIFICATION_CONFIDENCE');

    const overlap = pageText ? tokenOverlap(item.question, pageText) : 0;
    if (pageText && overlap < 0.2) issues.push('WEAK_SOURCE_TEXT_MATCH');

    const candidatesOnPage = (result.mcqs ?? []).filter((candidate) => candidate.sourcePage === item.sourcePage).length;
    const sourceAnswerIndex = pageText ? sourceAnswer(pageText, candidatesOnPage) : null;
    let answerVerification = 'HUMAN_VERIFICATION_REQUIRED';
    if (sourceAnswerIndex !== null) {
      if (answerIndex === null || answerIndex === undefined) {
        answerVerification = 'SOURCE_KEY_AVAILABLE_REQUIRES_REVIEW';
      } else {
        answerVerification = sourceAnswerIndex === answerIndex ? 'SOURCE_KEY_MATCH' : 'SOURCE_KEY_CONFLICT';
        if (sourceAnswerIndex !== answerIndex) issues.push('SOURCE_ANSWER_KEY_CONFLICT');
      }
    } else {
      issues.push('NO_SOURCE_ANSWER_KEY');
    }

    const blocked = issues.some((issue) => [
      'TOPIC_NOT_CONFIRMED',
      'SOURCE_PAGE_NOT_CONFIRMED',
      'OPTIONS_INVALID',
      'ANSWER_INDEX_INVALID',
      'SOURCE_ANSWER_KEY_CONFLICT',
    ].includes(issue));

    return {
      ...item,
      quality: {
        status: blocked ? 'BLOCKED' : 'REVIEW_REQUIRED',
        issues,
        answerVerification,
        sourceTextOverlap: Math.round(overlap * 1000) / 1000,
        publishable: false,
      },
    };
  });

  const resources = (result.resources ?? []).map((item) => {
    const issues = [];
    const pageText = pageMap.get(item.sourcePage);
    if (!item.topicId || !topicIds.has(item.topicId)) issues.push('TOPIC_NOT_CONFIRMED');
    if (!Number.isInteger(item.sourcePage) || !pageMap.has(item.sourcePage)) issues.push('SOURCE_PAGE_NOT_CONFIRMED');
    if (String(item.title ?? '').trim().length < 3) issues.push('TITLE_TOO_SHORT');
    if (String(item.body ?? '').trim().length < 80) issues.push('RESOURCE_TOO_SHORT');
    if (typeof item.confidence !== 'number' || item.confidence < 0.8) issues.push('LOW_CLASSIFICATION_CONFIDENCE');
    const overlap = pageText ? tokenOverlap(item.body, pageText) : 0;
    if (pageText && overlap < 0.15) issues.push('WEAK_SOURCE_TEXT_MATCH');
    const blocked = issues.some((issue) =>
      ['TOPIC_NOT_CONFIRMED', 'SOURCE_PAGE_NOT_CONFIRMED', 'TITLE_TOO_SHORT', 'RESOURCE_TOO_SHORT'].includes(issue)
    );
    return {
      ...item,
      quality: {
        status: blocked ? 'BLOCKED' : 'REVIEW_REQUIRED',
        issues,
        sourceTextOverlap: Math.round(overlap * 1000) / 1000,
        publishable: false,
      },
    };
  });

  const all = [...mcqs, ...resources];
  const summary = {
    total: all.length,
    mcqs: mcqs.length,
    resources: resources.length,
    blocked: all.filter((item) => item.quality.status === 'BLOCKED').length,
    reviewRequired: all.filter((item) => item.quality.status === 'REVIEW_REQUIRED').length,
    sourceKeyMatched: mcqs.filter((item) => item.quality.answerVerification === 'SOURCE_KEY_MATCH').length,
    sourceKeyConflicts: mcqs.filter((item) => item.quality.answerVerification === 'SOURCE_KEY_CONFLICT').length,
    humanAnswerVerificationRequired: mcqs.filter((item) => item.quality.answerVerification === 'HUMAN_VERIFICATION_REQUIRED').length,
    autoPublished: 0,
  };

  return { ...result, mcqs, resources, qualitySummary: summary };
}
