import { generateJson } from './provider.mjs';

export class ClassifyError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MAX_SOURCE_CHARS = 60000; // ~15k tokens of source text, well under the model's input budget

function buildPrompt(markedText, syllabusTree) {
  const topicList = syllabusTree.flatMap((subject) =>
    subject.chapters.flatMap((chapter) =>
      chapter.topics.map(
        (topic) => `${topic.id} | ${topic.name} | chapter=${chapter.id} (${chapter.name}) | subject=${subject.id} (${subject.name})`
      )
    )
  );

  const system = `You are sorting raw study material for a TNPSC exam-prep app into its existing syllabus.
You will get a list of real topics that already exist, and raw text extracted from an admin-uploaded document.
The text is broken into "=== PAGE N ===" sections matching the document's real page numbers. The document may
mix multiple choice questions (with answers) and plain study notes/explanations, across several different
topics and sections, in any order, and may run to many pages.

Your job: split the text into individual MCQs and individual study-note chunks, and for each one, point it at
the single best-matching existing topic id. Only propose a brand new topic when nothing in the existing list is
a reasonable match -- reusing an existing topic is always preferred over inventing one.

CRITICAL -- be exhaustive, not a representative sample: extract EVERY numbered question in the document
(worked examples AND "practice questions" sections both count), not just the first few or one per section.
A document with 50 questions across 6 sections must produce roughly 50 mcqs, grouped under several different
topics/sections as appropriate -- never stop early or summarize because there are many. Each distinct
section heading (e.g. "PUZZLES", "DICE", "CUBES", "ALPHA NUMBER SERIES", "CODING-DECODING") is its own batch
of questions and usually maps to its own topic -- don't let one section's topic choice bleed into another's.

CRITICAL -- diagrams: many reasoning questions (seating charts, dice nets, cube views, visual series) show a
figure that the extracted text cannot represent -- you'll see the question and options but no picture. When a
question cannot be fully understood or solved from the text alone (the options refer to positions/shapes/faces
that only make sense looking at a picture you don't have), set "needsDiagram": true and "sourcePage" to the
page number (from the "=== PAGE N ===" marker) that question appears on, so the real page image can be
captured and attached later. Still extract the question, options and the stated answer exactly as given (look
for "Ans:" or "Solution:" markers) even when you can't verify the reasoning yourself -- write an honest
explanation (e.g. "Answer given in the source material; the reasoning depends on a diagram not shown here.")
rather than inventing reasoning you can't verify from text. For ordinary questions that are fully readable as
text, set "needsDiagram": false and "sourcePage": null.

Respond with ONLY strict JSON, no markdown fences, matching exactly this shape:
{
  "mcqs": [
    {
      "question": string,
      "options": [string, ...],          // 2-6 options, exact text, no "A)" prefixes
      "answerIndex": number,              // 0-based index into options
      "explanation": string,              // why that answer is correct
      "trap": string | null,              // why a wrong option is tempting, or null
      "needsDiagram": boolean,            // true if a figure in the source is essential and not captured in text
      "sourcePage": number | null,        // page number this question is on, required if needsDiagram is true
      "topicId": string | null,           // an id from the existing list, or null if none fits
      "isNewTopic": boolean,              // true if topicId is null and this needs a new topic
      "newTopicName": string | null,      // short name for the new topic, only if isNewTopic
      "newChapterId": string | null,      // best existing chapter id to place the new topic under
      "confidence": number                // 0-1, how sure you are of this classification
    }
  ],
  "resources": [
    {
      "title": string,                    // short heading for this note
      "body": string,                     // the explanation/notes text itself, cleaned up
      "needsDiagram": boolean,
      "sourcePage": number | null,
      "topicId": string | null,
      "isNewTopic": boolean,
      "newTopicName": string | null,
      "newChapterId": string | null,
      "confidence": number
    }
  ]
}

Skip page headers, footers, page numbers, and anything that isn't actually a question or a study note. If the
text has no usable MCQs or notes at all, return {"mcqs": [], "resources": []}.`;

  const user = `EXISTING TOPICS (id | name | chapter | subject):
${topicList.join('\n')}

RAW TEXT FROM THE UPLOADED DOCUMENT, BY PAGE:
"""
${markedText}
"""`;

  return { system, user };
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function sanitizeDiagramFields(raw, maxPage) {
  const sourcePage = Number.isInteger(raw.sourcePage) && raw.sourcePage >= 1 && raw.sourcePage <= maxPage ? raw.sourcePage : null;
  return {
    needsDiagram: Boolean(raw.needsDiagram) && sourcePage !== null,
    sourcePage,
  };
}

function sanitizeMcq(raw, validTopicIds, maxPage) {
  if (!raw || typeof raw !== 'object') return null;
  const question = cleanString(raw.question);
  const options = Array.isArray(raw.options) ? raw.options.map((o) => cleanString(o)).filter(Boolean) : [];
  if (!question || options.length < 2) return null;

  const answerIndex = Number.isInteger(raw.answerIndex) ? raw.answerIndex : -1;
  if (answerIndex < 0 || answerIndex >= options.length) return null;

  const topicId = cleanString(raw.topicId) || null;
  const isNewTopic = Boolean(raw.isNewTopic) && !validTopicIds.has(topicId);

  return {
    question,
    options,
    answerIndex,
    explanation: cleanString(raw.explanation, 'No explanation provided.'),
    trap: cleanString(raw.trap) || null,
    ...sanitizeDiagramFields(raw, maxPage),
    topicId: isNewTopic ? null : validTopicIds.has(topicId) ? topicId : null,
    isNewTopic: isNewTopic || !validTopicIds.has(topicId),
    newTopicName: isNewTopic ? cleanString(raw.newTopicName) || question.slice(0, 40) : null,
    newChapterId: isNewTopic ? cleanString(raw.newChapterId) || null : null,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
  };
}

function sanitizeResource(raw, validTopicIds, maxPage) {
  if (!raw || typeof raw !== 'object') return null;
  const title = cleanString(raw.title);
  const body = cleanString(raw.body);
  if (!title || !body) return null;

  const topicId = cleanString(raw.topicId) || null;
  const isNewTopic = Boolean(raw.isNewTopic) && !validTopicIds.has(topicId);

  return {
    title,
    body,
    ...sanitizeDiagramFields(raw, maxPage),
    topicId: isNewTopic ? null : validTopicIds.has(topicId) ? topicId : null,
    isNewTopic: isNewTopic || !validTopicIds.has(topicId),
    newTopicName: isNewTopic ? cleanString(raw.newTopicName) || title : null,
    newChapterId: isNewTopic ? cleanString(raw.newChapterId) || null : null,
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
  };
}

/**
 * Classifies pages of text extracted from an admin-uploaded document into
 * MCQs and study-note resources, each pointed at an existing topic or
 * flagged as needing a new one, and each flagged when it depends on a
 * diagram the text can't carry (so the caller can go capture that page as
 * an image). This is the one place in the content pipeline that spends an
 * AI call -- deliberately opt-in (an admin uploads a document) rather than
 * something that runs automatically, since the manual YAML path already
 * covers routine content growth at zero AI cost.
 *
 * @param {Array<{pageNumber: number, text: string}>} pages
 * @returns {Promise<{mcqs: Array<object>, resources: Array<object>, truncated: boolean}>}
 */
export async function classifyContent(pages, syllabusTree) {
  const maxPage = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) : 0;
  const fullMarkedText = pages.map((p) => `=== PAGE ${p.pageNumber} ===\n${p.text}`).join('\n\n');
  const truncated = fullMarkedText.length > MAX_SOURCE_CHARS;
  const markedText = truncated ? fullMarkedText.slice(0, MAX_SOURCE_CHARS) : fullMarkedText;

  if (!markedText.trim()) {
    throw new ClassifyError('EMPTY_TEXT', 'No text could be extracted from that file.');
  }

  const prompt = buildPrompt(markedText, syllabusTree);
  const result = await generateJson(prompt);

  if (!result) {
    throw new ClassifyError('CLASSIFY_UNAVAILABLE', 'The AI classifier is unavailable right now (not configured, or no response). Try again, or use the manual YAML upload instead.');
  }

  const validTopicIds = new Set(syllabusTree.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id))));

  const mcqs = Array.isArray(result.mcqs) ? result.mcqs.map((m) => sanitizeMcq(m, validTopicIds, maxPage)).filter(Boolean) : [];
  const resources = Array.isArray(result.resources)
    ? result.resources.map((r) => sanitizeResource(r, validTopicIds, maxPage)).filter(Boolean)
    : [];

  return { mcqs, resources, truncated };
}
