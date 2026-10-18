import crypto from 'crypto';
import { query } from './db.mjs';
import { ContentUploadError } from './adminContent.mjs';

const normalize = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------- subjects

export async function listSubjects() {
  const { rows } = await query('SELECT id, name, sort_order FROM subject ORDER BY sort_order');
  return rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order }));
}

export async function createSubject({ id, name }) {
  if (!id || !name) throw new ContentUploadError('MISSING_FIELDS', 'id and name are required');
  const { rows: existing } = await query('SELECT id FROM subject WHERE id = $1', [id]);
  if (existing.length > 0) throw new ContentUploadError('SUBJECT_EXISTS', `Subject ${id} already exists`);
  const { rows: maxSort } = await query('SELECT COALESCE(MAX(sort_order), 0)::int AS n FROM subject');
  await query('INSERT INTO subject (id, name, sort_order) VALUES ($1, $2, $3)', [id, name, maxSort[0].n + 1]);
}

export async function updateSubject(id, { name }) {
  const { rows } = await query('UPDATE subject SET name = COALESCE($2, name) WHERE id = $1 RETURNING id', [id, name ?? null]);
  if (rows.length === 0) throw new ContentUploadError('SUBJECT_NOT_FOUND', `No subject ${id}`);
}

export async function deleteSubject(id) {
  const { rowCount } = await query('DELETE FROM subject WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('SUBJECT_NOT_FOUND', `No subject ${id}`);
}

// ---------------------------------------------------------------- chapters

export async function createChapter({ id, subjectId, name, questionCount }) {
  if (!id || !subjectId || !name) throw new ContentUploadError('MISSING_FIELDS', 'id, subjectId and name are required');
  const { rows: subjectRows } = await query('SELECT id FROM subject WHERE id = $1', [subjectId]);
  if (subjectRows.length === 0) throw new ContentUploadError('SUBJECT_NOT_FOUND', `No subject ${subjectId}`);
  const { rows: existing } = await query('SELECT id FROM chapter WHERE id = $1', [id]);
  if (existing.length > 0) throw new ContentUploadError('CHAPTER_EXISTS', `Chapter ${id} already exists`);
  const { rows: maxSort } = await query('SELECT COALESCE(MAX(sort_order), 0)::int AS n FROM chapter WHERE subject_id = $1', [subjectId]);
  await query('INSERT INTO chapter (id, subject_id, name, sort_order, question_count) VALUES ($1, $2, $3, $4, $5)', [
    id,
    subjectId,
    name,
    maxSort[0].n + 1,
    questionCount ?? 0,
  ]);
}

export async function updateChapter(id, { name, questionCount }) {
  const { rows } = await query(
    'UPDATE chapter SET name = COALESCE($2, name), question_count = COALESCE($3, question_count) WHERE id = $1 RETURNING id',
    [id, name ?? null, questionCount ?? null]
  );
  if (rows.length === 0) throw new ContentUploadError('CHAPTER_NOT_FOUND', `No chapter ${id}`);
}

export async function deleteChapter(id) {
  const { rowCount } = await query('DELETE FROM chapter WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('CHAPTER_NOT_FOUND', `No chapter ${id}`);
}

// ------------------------------------------------------------------ topics

export async function updateTopic(id, { name }) {
  const { rows } = await query('UPDATE topic SET name = COALESCE($2, name) WHERE id = $1 RETURNING id', [id, name ?? null]);
  if (rows.length === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${id}`);
}

export async function deleteTopic(id) {
  const { rowCount } = await query('DELETE FROM topic WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${id}`);
}

// ----------------------------------------------------------------- lessons

export async function upsertLesson(topicId, {
  title, concept, exampleProblem, exampleSteps, exampleAnswer, tip,
  definition, formulas, shortcuts, commonMistakes,
}) {
  if (!title || !concept || !exampleProblem || !exampleAnswer || !tip) {
    throw new ContentUploadError('MISSING_FIELDS', 'title, concept, exampleProblem, exampleAnswer and tip are required');
  }
  const { rows: topicRows } = await query('SELECT id FROM topic WHERE id = $1', [topicId]);
  if (topicRows.length === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topicId}`);

  const steps = Array.isArray(exampleSteps) ? exampleSteps.filter((s) => typeof s === 'string' && s.trim()) : [];
  if (steps.length === 0) throw new ContentUploadError('MISSING_STEPS', 'At least one example step is required');

  // These four are optional depth on top of the worked example -- a topic
  // can have a perfectly good lesson without them, so empty/omitted is
  // valid, not an error.
  const cleanList = (arr) => (Array.isArray(arr) ? arr.filter((s) => typeof s === 'string' && s.trim()) : []);

  await query(
    `INSERT INTO lesson (
       topic_id, title, concept, example_problem, example_steps, example_answer, tip,
       definition, formulas, shortcuts, common_mistakes
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)
     ON CONFLICT (topic_id) DO UPDATE SET
       title = EXCLUDED.title, concept = EXCLUDED.concept, example_problem = EXCLUDED.example_problem,
       example_steps = EXCLUDED.example_steps, example_answer = EXCLUDED.example_answer, tip = EXCLUDED.tip,
       definition = EXCLUDED.definition, formulas = EXCLUDED.formulas,
       shortcuts = EXCLUDED.shortcuts, common_mistakes = EXCLUDED.common_mistakes,
       updated_at = now()`,
    [
      topicId, title, concept, exampleProblem, JSON.stringify(steps), exampleAnswer, tip,
      definition?.trim() || null,
      JSON.stringify(cleanList(formulas)),
      JSON.stringify(cleanList(shortcuts)),
      JSON.stringify(cleanList(commonMistakes)),
    ]
  );
}

export async function deleteLesson(topicId) {
  const { rowCount } = await query('DELETE FROM lesson WHERE topic_id = $1', [topicId]);
  if (rowCount === 0) throw new ContentUploadError('LESSON_NOT_FOUND', `No lesson for topic ${topicId}`);
}

export async function listLessonsByTopic() {
  const { rows } = await query(`
    SELECT t.id AS topic_id, t.name AS topic_name, c.name AS chapter_name, s.name AS subject_name,
           l.title, (l.topic_id IS NOT NULL) AS has_lesson
      FROM topic t
      JOIN chapter c ON c.id = t.chapter_id
      JOIN subject s ON s.id = c.subject_id
      LEFT JOIN lesson l ON l.topic_id = t.id
     ORDER BY s.sort_order, c.sort_order, t.sort_order
  `);
  return rows.map((r) => ({
    topicId: r.topic_id,
    topicName: r.topic_name,
    chapterName: r.chapter_name,
    subjectName: r.subject_name,
    hasLesson: r.has_lesson,
    title: r.title,
  }));
}

export async function getLessonForEdit(topicId) {
  const { rows } = await query(
    `SELECT title, concept, example_problem, example_steps, example_answer, tip,
            definition, formulas, shortcuts, common_mistakes
       FROM lesson WHERE topic_id = $1`,
    [topicId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    title: r.title,
    concept: r.concept,
    exampleProblem: r.example_problem,
    exampleSteps: r.example_steps,
    exampleAnswer: r.example_answer,
    tip: r.tip,
    definition: r.definition,
    formulas: r.formulas,
    shortcuts: r.shortcuts,
    commonMistakes: r.common_mistakes,
  };
}

// --------------------------------------------------------------- questions

export async function listQuestionsByTopic(topicId) {
  const { rows } = await query(
    `SELECT id, prompt, options, answer_index, explanation, trap, difficulty::float8 AS difficulty,
            estimated_seconds, status, source, (image_data IS NOT NULL) AS has_image, updated_at
       FROM question WHERE topic_id = $1 ORDER BY updated_at DESC`,
    [topicId]
  );
  return rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: r.options,
    answerIndex: r.answer_index,
    explanation: r.explanation,
    trap: r.trap,
    difficulty: r.difficulty,
    estimatedSeconds: r.estimated_seconds,
    status: r.status,
    source: r.source,
    hasImage: r.has_image,
    updatedAt: r.updated_at,
  }));
}

export async function getQuestion(id) {
  const { rows } = await query(
    `SELECT id, topic_id, prompt, options, answer_index, explanation, trap, difficulty::float8 AS difficulty,
            estimated_seconds, status FROM question WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    topicId: r.topic_id,
    prompt: r.prompt,
    options: r.options,
    answerIndex: r.answer_index,
    explanation: r.explanation,
    trap: r.trap,
    difficulty: r.difficulty,
    estimatedSeconds: r.estimated_seconds,
    status: r.status,
  };
}

export async function createQuestion({ topicId, prompt, options, answerIndex, explanation, trap, difficulty, estimatedSeconds, language }) {
  if (!topicId || !prompt || !Array.isArray(options) || options.length < 2 || !explanation) {
    throw new ContentUploadError('MISSING_FIELDS', 'topicId, prompt, at least 2 options and explanation are required');
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
    throw new ContentUploadError('INVALID_ANSWER', 'answerIndex must be a valid option index');
  }
  const { rows: topicRows } = await query('SELECT id FROM topic WHERE id = $1', [topicId]);
  if (topicRows.length === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topicId}`);

  const id = `manual-${crypto.randomUUID().slice(0, 12)}`;
  const hash = crypto.createHash('sha256').update(normalize(prompt)).digest('hex');
  await query(
    `INSERT INTO question (id, topic_id, language, prompt, options, answer_index, explanation, trap, difficulty, estimated_seconds, source, status, normalized_hash)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,'admin-manual','PUBLISHED',$11)`,
    [id, topicId, language ?? 'en', prompt, JSON.stringify(options), answerIndex, explanation, trap ?? null, difficulty ?? 0.3, estimatedSeconds ?? 45, hash]
  );
  return id;
}

export async function updateQuestion(id, { prompt, options, answerIndex, explanation, trap, difficulty, estimatedSeconds, status }) {
  const existing = await getQuestion(id);
  if (!existing) throw new ContentUploadError('QUESTION_NOT_FOUND', `No question ${id}`);

  const nextOptions = options ?? existing.options;
  const nextAnswerIndex = answerIndex ?? existing.answerIndex;
  if (!Number.isInteger(nextAnswerIndex) || nextAnswerIndex < 0 || nextAnswerIndex >= nextOptions.length) {
    throw new ContentUploadError('INVALID_ANSWER', 'answerIndex must be a valid option index');
  }
  const nextPrompt = prompt ?? existing.prompt;
  const hash = crypto.createHash('sha256').update(normalize(nextPrompt)).digest('hex');

  await query(
    `UPDATE question SET
       prompt = $2, options = $3::jsonb, answer_index = $4, explanation = $5, trap = $6,
       difficulty = $7, estimated_seconds = $8, status = $9, normalized_hash = $10, updated_at = now()
     WHERE id = $1`,
    [
      id,
      nextPrompt,
      JSON.stringify(nextOptions),
      nextAnswerIndex,
      explanation ?? existing.explanation,
      trap !== undefined ? trap : existing.trap,
      difficulty ?? existing.difficulty,
      estimatedSeconds ?? existing.estimatedSeconds,
      status ?? existing.status,
      hash,
    ]
  );
}

export async function deleteQuestion(id) {
  const { rowCount } = await query('DELETE FROM question WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('QUESTION_NOT_FOUND', `No question ${id}`);
}

// ----------------------------------------------------------- test templates

export async function listTestTemplates() {
  const { rows } = await query(`
    SELECT tt.id, tt.name, tt.description, tt.question_count, tt.active, tt.created_at,
           COALESCE(json_agg(json_build_object('topicId', ttt.topic_id, 'topicName', t.name, 'targetCount', ttt.target_count))
                    FILTER (WHERE ttt.topic_id IS NOT NULL), '[]') AS topics
      FROM test_template tt
      LEFT JOIN test_template_topic ttt ON ttt.template_id = tt.id
      LEFT JOIN topic t ON t.id = ttt.topic_id
     GROUP BY tt.id
     ORDER BY tt.created_at DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    questionCount: r.question_count,
    active: r.active,
    createdAt: r.created_at,
    topics: r.topics,
  }));
}

export async function createTestTemplate({ name, description, topics }) {
  if (!name || !Array.isArray(topics) || topics.length === 0) {
    throw new ContentUploadError('MISSING_FIELDS', 'name and at least one topic are required');
  }
  for (const t of topics) {
    if (!t.topicId || !Number.isInteger(t.targetCount) || t.targetCount <= 0) {
      throw new ContentUploadError('INVALID_TOPIC', 'Each topic needs a topicId and a positive targetCount');
    }
  }
  const questionCount = topics.reduce((sum, t) => sum + t.targetCount, 0);

  const { rows } = await query(
    'INSERT INTO test_template (name, description, question_count) VALUES ($1, $2, $3) RETURNING id',
    [name, description ?? null, questionCount]
  );
  const templateId = rows[0].id;

  for (const t of topics) {
    await query('INSERT INTO test_template_topic (template_id, topic_id, target_count) VALUES ($1, $2, $3)', [
      templateId,
      t.topicId,
      t.targetCount,
    ]);
  }
  return templateId;
}

export async function updateTestTemplate(id, { name, description, active, topics }) {
  const { rows } = await query('SELECT id FROM test_template WHERE id = $1', [id]);
  if (rows.length === 0) throw new ContentUploadError('TEMPLATE_NOT_FOUND', `No test template ${id}`);

  if (Array.isArray(topics)) {
    for (const t of topics) {
      if (!t.topicId || !Number.isInteger(t.targetCount) || t.targetCount <= 0) {
        throw new ContentUploadError('INVALID_TOPIC', 'Each topic needs a topicId and a positive targetCount');
      }
    }
    await query('DELETE FROM test_template_topic WHERE template_id = $1', [id]);
    for (const t of topics) {
      await query('INSERT INTO test_template_topic (template_id, topic_id, target_count) VALUES ($1, $2, $3)', [id, t.topicId, t.targetCount]);
    }
    const questionCount = topics.reduce((sum, t) => sum + t.targetCount, 0);
    await query('UPDATE test_template SET question_count = $2 WHERE id = $1', [id, questionCount]);
  }

  await query(
    `UPDATE test_template SET name = COALESCE($2, name), description = COALESCE($3, description),
       active = COALESCE($4, active), updated_at = now() WHERE id = $1`,
    [id, name ?? null, description ?? null, active ?? null]
  );
}

export async function deleteTestTemplate(id) {
  const { rowCount } = await query('DELETE FROM test_template WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('TEMPLATE_NOT_FOUND', `No test template ${id}`);
}

// ----------------------------------------------------------- quick lab modes

export async function listQuicklabModes() {
  const { rows } = await query('SELECT mode_key, display_name, description, enabled, recommended, sort_order FROM quicklab_mode ORDER BY sort_order');
  return rows.map((r) => ({
    modeKey: r.mode_key,
    displayName: r.display_name,
    description: r.description,
    enabled: r.enabled,
    recommended: r.recommended,
    sortOrder: r.sort_order,
  }));
}

export async function updateQuicklabMode(modeKey, { displayName, description, enabled, recommended, sortOrder }) {
  const { rows } = await query(
    `UPDATE quicklab_mode SET
       display_name = COALESCE($2, display_name), description = COALESCE($3, description),
       enabled = COALESCE($4, enabled), recommended = COALESCE($5, recommended),
       sort_order = COALESCE($6, sort_order), updated_at = now()
     WHERE mode_key = $1 RETURNING mode_key`,
    [modeKey, displayName ?? null, description ?? null, enabled ?? null, recommended ?? null, sortOrder ?? null]
  );
  if (rows.length === 0) throw new ContentUploadError('MODE_NOT_FOUND', `No quick lab mode ${modeKey}`);
}
