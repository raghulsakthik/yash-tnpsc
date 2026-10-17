import crypto from 'crypto';
import YAML from 'yaml';
import { query } from './db.mjs';

export class ContentUploadError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Same normalization scripts/seed.mjs uses for normalized_hash, so a
// question uploaded here and one already seeded from content/ are
// recognized as the same question rather than silently duplicated.
const normalize = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Parses and validates one admin-uploaded YAML document. Same shape as a
 * content/questions/*.yaml file -- an admin is authoring exactly the
 * content a developer would, just without touching the repo or spending
 * an AI token on it.
 *
 * @param {string} yamlText
 * @returns {{topic: string, language: string, source: string, questions: Array<object>}}
 */
export function parseQuestionYaml(yamlText) {
  let doc;
  try {
    doc = YAML.parse(yamlText);
  } catch (err) {
    throw new ContentUploadError('INVALID_YAML', `Could not parse YAML: ${err.message}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new ContentUploadError('INVALID_SHAPE', 'The file must be a YAML document with topic/language/questions.');
  }
  if (!doc.topic || typeof doc.topic !== 'string') {
    throw new ContentUploadError('MISSING_TOPIC', 'A `topic` id is required (e.g. aptitude.averages).');
  }
  if (!Array.isArray(doc.questions) || doc.questions.length === 0) {
    throw new ContentUploadError('MISSING_QUESTIONS', 'At least one question is required under `questions:`.');
  }

  doc.questions.forEach((q, i) => {
    const at = `questions[${i}]`;
    if (!q.id || typeof q.id !== 'string') throw new ContentUploadError('INVALID_QUESTION', `${at}: missing id`);
    if (!q.question || typeof q.question !== 'string') throw new ContentUploadError('INVALID_QUESTION', `${at}: missing question text`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new ContentUploadError('INVALID_QUESTION', `${at}: needs at least 2 options`);
    if (new Set(q.options.map(String)).size !== q.options.length) throw new ContentUploadError('INVALID_QUESTION', `${at}: options must be distinct`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
      throw new ContentUploadError('INVALID_QUESTION', `${at}: answer must be a valid option index`);
    }
    if (!q.explanation || typeof q.explanation !== 'string') throw new ContentUploadError('INVALID_QUESTION', `${at}: missing explanation`);
  });

  return {
    topic: doc.topic,
    language: doc.language ?? 'en',
    source: doc.source ?? 'admin-upload',
    questions: doc.questions,
  };
}

/**
 * Creates a brand-new topic (and, if it doesn't exist yet, its chapter)
 * under an existing subject. Never invents a subject -- an admin picks
 * one of the real syllabus subjects from /api/admin/syllabus.
 */
export async function createTopic({ topicId, topicName, chapterId, chapterName, subjectId }) {
  const { rows: chapterRows } = await query(`SELECT id, subject_id FROM chapter WHERE id = $1`, [chapterId]);

  if (chapterRows.length === 0) {
    if (!chapterName || !subjectId) {
      throw new ContentUploadError('MISSING_CHAPTER', 'Creating a new chapter needs both a chapter name and an existing subject.');
    }
    const { rows: subjectRows } = await query(`SELECT id FROM subject WHERE id = $1`, [subjectId]);
    if (subjectRows.length === 0) throw new ContentUploadError('SUBJECT_NOT_FOUND', `No subject ${subjectId}`);

    const { rows: maxSort } = await query(`SELECT COALESCE(MAX(sort_order), 0)::int AS n FROM chapter WHERE subject_id = $1`, [subjectId]);
    await query(
      `INSERT INTO chapter (id, subject_id, name, sort_order, question_count) VALUES ($1, $2, $3, $4, 0)`,
      [chapterId, subjectId, chapterName, maxSort[0].n + 1]
    );
  }

  const { rows: existingTopic } = await query(`SELECT id FROM topic WHERE id = $1`, [topicId]);
  if (existingTopic.length > 0) {
    throw new ContentUploadError('TOPIC_EXISTS', `Topic ${topicId} already exists -- upload questions to it directly instead.`);
  }

  const { rows: maxTopicSort } = await query(`SELECT COALESCE(MAX(sort_order), -1)::int AS n FROM topic WHERE chapter_id = $1`, [chapterId]);
  await query(`INSERT INTO topic (id, chapter_id, name, sort_order) VALUES ($1, $2, $3, $4)`, [
    topicId,
    chapterId,
    topicName,
    maxTopicSort[0].n + 1,
  ]);
}

/**
 * Upserts every question in a parsed document against an existing topic.
 * Mirrors scripts/seed.mjs's question insert exactly, so content uploaded
 * here behaves identically to content shipped in content/questions/.
 *
 * @returns {Promise<{inserted: number, updated: number}>}
 */
export async function upsertQuestions({ topic, language, source, questions }) {
  const { rows: topicRows } = await query(`SELECT id FROM topic WHERE id = $1`, [topic]);
  if (topicRows.length === 0) {
    throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topic} -- create it first or check the id.`);
  }

  let inserted = 0;
  let updated = 0;

  for (const q of questions) {
    const hash = crypto.createHash('sha256').update(normalize(q.question)).digest('hex');
    const { rows } = await query(
      `INSERT INTO question (
         id, topic_id, language, prompt, options, answer_index, explanation, trap,
         difficulty, estimated_seconds, source, source_year, status, normalized_hash, image_data
       ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,'PUBLISHED',$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         prompt = EXCLUDED.prompt,
         options = EXCLUDED.options,
         answer_index = EXCLUDED.answer_index,
         explanation = EXCLUDED.explanation,
         trap = EXCLUDED.trap,
         difficulty = EXCLUDED.difficulty,
         estimated_seconds = EXCLUDED.estimated_seconds,
         normalized_hash = EXCLUDED.normalized_hash,
         image_data = EXCLUDED.image_data,
         updated_at = now()
       RETURNING (xmax = 0) AS was_insert`,
      [
        q.id,
        topic,
        language,
        q.question,
        JSON.stringify(q.options),
        q.answer,
        q.explanation,
        q.trap ?? null,
        q.difficulty ?? 0.3,
        q.estimatedSeconds ?? 45,
        q.source ?? source,
        q.year ?? null,
        hash,
        q.imageData ?? null,
      ]
    );
    if (rows[0]?.was_insert) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

/**
 * Inserts one study-resource note against an existing topic. Never
 * deduped/upserted by title -- a PDF commonly contributes several distinct
 * notes to the same topic over time, and re-running a commit is rare
 * enough that a stray duplicate is a cheaper mistake than silently
 * dropping a second genuinely different note with the same title.
 */
export async function upsertResource({ topicId, title, body, source, imageData }) {
  const { rows: topicRows } = await query(`SELECT id FROM topic WHERE id = $1`, [topicId]);
  if (topicRows.length === 0) {
    throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topicId} -- create it first or check the id.`);
  }
  await query(
    `INSERT INTO topic_resource (topic_id, title, body, source, image_data) VALUES ($1, $2, $3, $4, $5)`,
    [topicId, title, body, source ?? 'admin-upload', imageData ?? null]
  );
}

/**
 * Creates the topic (and chapter, if needed) only if it doesn't already
 * exist -- unlike createTopic, which errors on a collision. The PDF
 * classify/commit flow calls this because the same new topic can be the
 * destination for several items in one upload.
 */
export async function createTopicIfMissing({ topicId, topicName, chapterId, chapterName, subjectId }) {
  const { rows } = await query(`SELECT id FROM topic WHERE id = $1`, [topicId]);
  if (rows.length > 0) return;
  await createTopic({ topicId, topicName, chapterId, chapterName, subjectId });
}

/**
 * The full subject -> chapter -> topic tree, same shape /api/admin/syllabus
 * returns. Shared so the PDF classifier can tell the AI exactly which real
 * topics already exist, instead of it guessing at ids.
 */
export async function getSyllabusTree() {
  // LEFT JOINs deliberately -- a subject or chapter an admin just created
  // (via /admin/subjects) legitimately has zero chapters/topics yet and
  // must still show up so it can be built out, not vanish from the tree.
  const { rows } = await query(`
    SELECT s.id AS subject_id, s.name AS subject_name, s.sort_order AS subject_sort,
           c.id AS chapter_id, c.name AS chapter_name, c.sort_order AS chapter_sort,
           t.id AS topic_id, t.name AS topic_name, t.sort_order AS topic_sort,
           (SELECT COUNT(*)::int FROM question q WHERE q.topic_id = t.id AND q.status = 'PUBLISHED') AS question_count
      FROM subject s
      LEFT JOIN chapter c ON c.subject_id = s.id
      LEFT JOIN topic t ON t.chapter_id = c.id
     ORDER BY s.sort_order, c.sort_order, t.sort_order
  `);

  const subjects = new Map();
  for (const r of rows) {
    if (!subjects.has(r.subject_id)) {
      subjects.set(r.subject_id, { id: r.subject_id, name: r.subject_name, chapters: new Map() });
    }
    const subject = subjects.get(r.subject_id);
    if (r.chapter_id && !subject.chapters.has(r.chapter_id)) {
      subject.chapters.set(r.chapter_id, { id: r.chapter_id, name: r.chapter_name, subjectId: r.subject_id, topics: [] });
    }
    if (r.chapter_id && r.topic_id) {
      subject.chapters.get(r.chapter_id).topics.push({ id: r.topic_id, name: r.topic_name, questionCount: r.question_count });
    }
  }

  return [...subjects.values()].map((s) => ({ ...s, chapters: [...s.chapters.values()] }));
}
