import crypto from 'node:crypto';
import { generateJson, MODEL } from './ai/provider.mjs';

export class LessonGenerationError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.code = code;
    this.issues = issues;
  }
}

const clean = (value) => String(value ?? '').trim();
const normalize = (value) => clean(value).toLocaleLowerCase().replace(/\s+/g, ' ');

export function validateGeneratedContent(output, evidence, expectedMcqs) {
  const issues = [];
  if (!output || typeof output !== 'object') return { valid: false, issues: ['INVALID_JSON'] };
  const lesson = output.lesson;
  if (!lesson || clean(lesson.title).length < 4 || clean(lesson.concept).length < 80 ||
      clean(lesson.definition).length < 20 || clean(lesson.explanation).length < 120) issues.push('LESSON_INCOMPLETE');
  if (!Array.isArray(lesson?.examples) || lesson.examples.length !== 1 ||
      lesson.examples.some((x) => !x || typeof x !== 'object' || !clean(x.problem) || !Array.isArray(x.steps) || x.steps.length < 2 || !clean(x.answer))) issues.push('WORKED_EXAMPLE_INCOMPLETE');
  if (!Array.isArray(lesson?.revisionNotes) || lesson.revisionNotes.length < 2) issues.push('REVISION_NOTES_MISSING');

  const allowed = new Map(evidence.map((item) => [item.id, item.body]));
  const mcqs = Array.isArray(output.mcqs) ? output.mcqs : [];
  if (mcqs.length !== expectedMcqs) issues.push('MCQ_COUNT_MISMATCH');
  for (const [index, q] of mcqs.entries()) {
    if (!q || typeof q !== 'object') {
      issues.push(`MCQ_${index + 1}_INVALID`);
      continue;
    }
    if (clean(q.question).length < 15 || !Array.isArray(q.options) || q.options.length !== 4 ||
        q.options.some((x) => !clean(x)) || new Set(q.options.map(normalize)).size !== 4 ||
        !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3 ||
        clean(q.explanation).length < 30 || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
      issues.push(`MCQ_${index + 1}_INVALID`);
    }
    const sourceIds = Array.isArray(q.sourceIds) ? q.sourceIds : [];
    if (!sourceIds.length || sourceIds.some((id) => !allowed.has(id))) issues.push(`MCQ_${index + 1}_SOURCE_IDS_INVALID`);
    const anchor = q.answerEvidence;
    if (!anchor || !sourceIds.includes(anchor.sourceId) || clean(anchor.quote).length < 24 || clean(anchor.quote).length > 400) {
      issues.push(`MCQ_${index + 1}_ANSWER_EVIDENCE_MISSING`);
      continue;
    }
    const sourceText = allowed.get(anchor.sourceId) ?? '';
    if (!sourceText.includes(clean(anchor.quote))) issues.push(`MCQ_${index + 1}_ANSWER_EVIDENCE_NOT_FOUND`);
  }

  const lessonSources = Array.isArray(lesson?.sourceIds) ? lesson.sourceIds : [];
  if (!lessonSources.length || lessonSources.some((id) => !allowed.has(id))) issues.push('LESSON_SOURCE_IDS_INVALID');
  return { valid: issues.length === 0, issues };
}

export async function generateTopicPackage({ topic, evidence, mcqCount = 5 }) {
  if (!process.env.GEMINI_API_KEY) throw new LessonGenerationError('AI_PROVIDER_NOT_CONFIGURED', 'GEMINI_API_KEY is not configured on the server. Add it to the deployment secret store to enable generation.');
  if (!Array.isArray(evidence) || !evidence.length) throw new LessonGenerationError('NO_APPROVED_EVIDENCE', 'This topic has no approved, non-PYQ source material. Approve or upload source material before generating.');
  const evidenceText = evidence.map((item) => ({
    sourceId: item.id,
    title: item.title,
    source: item.source,
    body: item.body,
  }));
  const system = `You are a careful TNPSC educator and assessment writer. Use ONLY the supplied approved source excerpts. Never invent facts, dates, laws, formulas, or answer keys. Do not use or reproduce previous-year question text. Create beginner-friendly, syllabus-aligned lesson content and exactly ${mcqCount} original four-option MCQs. Every MCQ must have one defensible correct answer explicitly supported by a verbatim answerEvidence quote from one supplied source. The quote must be copied exactly from that source body, not paraphrased. answerIndex is zero-based (A=0, B=1, C=2, D=3). If the source evidence cannot support an unambiguous answer, do not guess; return fewer MCQs only if impossible, and state the gap in qualityNotes. Output JSON only with this shape: {lesson:{title,concept,definition,explanation,examples:[{problem,steps:[...],answer}],revisionNotes:[...],sourceIds:[...]},mcqs:[{question,options:[4 strings],answerIndex,explanation,difficulty:"easy|medium|hard",sourceIds:[...],answerEvidence:{sourceId,quote}}],qualityNotes:[...]}. Provide exactly one detailed worked example because the learner lesson view has one primary worked-example slot. Teach from first principles, define terminology, use worked steps, and avoid claiming guaranteed exam appearance.`;
  const user = `Syllabus topic: ${topic.name}\nTopic ID: ${topic.id}\nSubject: ${topic.subject_name}\nChapter: ${topic.chapter_name}\nGenerate ${mcqCount} MCQs.\nAPPROVED SOURCE EXCERPTS (IDs must be copied exactly):\n${JSON.stringify(evidenceText)}`;
  const output = await generateJson({ system, user });
  if (!output) throw new LessonGenerationError('AI_GENERATION_UNAVAILABLE', 'The AI provider returned no valid JSON. Check provider configuration, quota and availability; no content was staged.');
  const validation = validateGeneratedContent(output, evidence, mcqCount);
  if (!validation.valid) throw new LessonGenerationError('AI_OUTPUT_FAILED_VALIDATION', 'Generated output did not meet source-provenance or content requirements. Nothing was staged.', validation.issues);
  const publicationId = `ai-${crypto.randomUUID()}`;
  const lessonId = `lesson-${crypto.randomUUID()}`;
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const items = [{
    kind: 'lesson',
    content_id: lessonId,
    topic_id: topic.id,
    payload: { ...output.lesson, sourceIds: output.lesson.sourceIds, version: 1 },
  }];
  for (const q of output.mcqs) {
    items.push({
      kind: 'mcq',
      content_id: `mcq-${crypto.randomUUID()}`,
      topic_id: topic.id,
      payload: {
        ...q,
        explanation: `${clean(q.explanation)}\n\nSource evidence for reviewer: “${clean(q.answerEvidence.quote)}” — ${evidenceById.get(q.answerEvidence.sourceId)?.title || 'approved source'} (${evidenceById.get(q.answerEvidence.sourceId)?.source || q.answerEvidence.sourceId}${evidenceById.get(q.answerEvidence.sourceId)?.page ? `, page ${evidenceById.get(q.answerEvidence.sourceId).page}` : ''}). AI-suggested answer; independently verify before approval.`,
        sourceIds: q.sourceIds,
        version: 1,
      },
    });
  }
  return {
    publication: { publicationId, items },
    quality: {
      status: 'REVIEW_REQUIRED',
      answerVerification: 'UNVERIFIED_HUMAN_CHECK_REQUIRED',
      autoPublished: 0,
      sourceCount: evidence.length,
      mcqCount: output.mcqs.length,
      lessonCount: 1,
      notes: Array.isArray(output.qualityNotes) ? output.qualityNotes.slice(0, 10) : [],
      model: MODEL,
    },
  };
}
