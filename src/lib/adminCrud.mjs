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

const LESSON_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const LESSON_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']);

export async function upsertLesson(topicId, {
  title, concept, exampleProblem, exampleSteps, exampleAnswer, tip,
  definition, formulas, shortcuts, commonMistakes,
  // Admin Portal's richer authoring fields (see V71__lesson_authoring_metadata.sql).
  // Two different admin editors write to this table now: /admin/lessons
  // (worked-example-first) and the Admin Portal (markdown-first). Neither
  // is required to fill in the other's fields -- only one of "a worked
  // example" or "markdown content" has to actually be present for the
  // lesson to have real teachable content.
  description, learningObjectives, difficulty, estimatedDurationMinutes, contentMarkdown, status,
} = {}) {
  if (!title || !concept) {
    throw new ContentUploadError('MISSING_FIELDS', 'title and concept are required');
  }
  const { rows: topicRows } = await query('SELECT id FROM topic WHERE id = $1', [topicId]);
  if (topicRows.length === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topicId}`);

  const steps = Array.isArray(exampleSteps) ? exampleSteps.filter((s) => typeof s === 'string' && s.trim()) : [];
  const markdown = typeof contentMarkdown === 'string' ? contentMarkdown.trim() : '';
  const hasWorkedExample = Boolean(exampleProblem && exampleAnswer && tip && steps.length);
  if (!hasWorkedExample && !markdown) {
    throw new ContentUploadError('MISSING_CONTENT', 'Provide either a full worked example (problem, steps, answer, tip) or markdown content');
  }

  // These four are optional depth on top of the worked example -- a topic
  // can have a perfectly good lesson without them, so empty/omitted is
  // valid, not an error.
  const cleanList = (arr) => (Array.isArray(arr) ? arr.filter((s) => typeof s === 'string' && s.trim()) : []);

  if (difficulty !== undefined && !LESSON_DIFFICULTIES.has(difficulty)) {
    throw new ContentUploadError('INVALID_DIFFICULTY', `difficulty must be one of ${[...LESSON_DIFFICULTIES].join(', ')}`);
  }
  if (status !== undefined && !LESSON_STATUSES.has(status)) {
    throw new ContentUploadError('INVALID_STATUS', `status must be one of ${[...LESSON_STATUSES].join(', ')}`);
  }

  await query(
    `INSERT INTO lesson (
       topic_id, title, concept, example_problem, example_steps, example_answer, tip,
       definition, formulas, shortcuts, common_mistakes,
       description, learning_objectives, difficulty, estimated_duration_minutes, content_markdown, status, version
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb,
             $12, $13::jsonb, $14, $15, $16, $17, 1)
     ON CONFLICT (topic_id) DO UPDATE SET
       title = EXCLUDED.title, concept = EXCLUDED.concept,
       example_problem = COALESCE(NULLIF(EXCLUDED.example_problem, ''), lesson.example_problem),
       example_steps = CASE WHEN EXCLUDED.example_steps = '[]'::jsonb THEN lesson.example_steps ELSE EXCLUDED.example_steps END,
       example_answer = COALESCE(NULLIF(EXCLUDED.example_answer, ''), lesson.example_answer),
       tip = COALESCE(NULLIF(EXCLUDED.tip, ''), lesson.tip),
       definition = COALESCE(EXCLUDED.definition, lesson.definition),
       formulas = CASE WHEN EXCLUDED.formulas = '[]'::jsonb THEN lesson.formulas ELSE EXCLUDED.formulas END,
       shortcuts = CASE WHEN EXCLUDED.shortcuts = '[]'::jsonb THEN lesson.shortcuts ELSE EXCLUDED.shortcuts END,
       common_mistakes = CASE WHEN EXCLUDED.common_mistakes = '[]'::jsonb THEN lesson.common_mistakes ELSE EXCLUDED.common_mistakes END,
       description = COALESCE(NULLIF(EXCLUDED.description, ''), lesson.description),
       learning_objectives = CASE WHEN EXCLUDED.learning_objectives = '[]'::jsonb THEN lesson.learning_objectives ELSE EXCLUDED.learning_objectives END,
       difficulty = EXCLUDED.difficulty,
       estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
       content_markdown = COALESCE(NULLIF(EXCLUDED.content_markdown, ''), lesson.content_markdown),
       status = EXCLUDED.status,
       version = lesson.version + 1,
       updated_at = now()`,
    [
      topicId, title, concept, exampleProblem || '', JSON.stringify(steps), exampleAnswer || '', tip || '',
      definition?.trim() || null,
      JSON.stringify(cleanList(formulas)),
      JSON.stringify(cleanList(shortcuts)),
      JSON.stringify(cleanList(commonMistakes)),
      description?.trim() || '',
      JSON.stringify(cleanList(learningObjectives)),
      difficulty || 'Intermediate',
      Number.isFinite(Number(estimatedDurationMinutes)) ? Number(estimatedDurationMinutes) : 30,
      markdown,
      status || 'DRAFT',
    ]
  );
}

export async function deleteLesson(topicId) {
  const { rowCount } = await query('DELETE FROM lesson WHERE topic_id = $1', [topicId]);
  if (rowCount === 0) throw new ContentUploadError('LESSON_NOT_FOUND', `No lesson for topic ${topicId}`);
}

export async function listLessonsByTopic() {
  const { rows } = await query(`
    SELECT t.id AS topic_id, t.name AS topic_name, c.name AS chapter_name, s.id AS subject_id, s.name AS subject_name,
           l.title, (l.topic_id IS NOT NULL) AS has_lesson,
           l.description, l.difficulty, l.estimated_duration_minutes, l.status, l.version, l.updated_at
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
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    hasLesson: r.has_lesson,
    title: r.title,
    description: r.description,
    difficulty: r.difficulty,
    estimatedDurationMinutes: r.estimated_duration_minutes,
    status: r.status,
    version: r.version,
    updatedAt: r.updated_at,
  }));
}

export async function getLessonForEdit(topicId) {
  const { rows } = await query(
    `SELECT title, concept, example_problem, example_steps, example_answer, tip,
            definition, formulas, shortcuts, common_mistakes,
            description, learning_objectives, difficulty, estimated_duration_minutes,
            content_markdown, status, version, updated_at
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
    description: r.description,
    learningObjectives: r.learning_objectives,
    difficulty: r.difficulty,
    estimatedDurationMinutes: r.estimated_duration_minutes,
    contentMarkdown: r.content_markdown,
    status: r.status,
    version: r.version,
    updatedAt: r.updated_at,
  };
}

/** Status-only transition (submit for review / approve / publish / archive) without touching content. */
export async function setLessonStatus(topicId, status) {
  if (!LESSON_STATUSES.has(status)) {
    throw new ContentUploadError('INVALID_STATUS', `status must be one of ${[...LESSON_STATUSES].join(', ')}`);
  }
  const { rowCount } = await query(
    `UPDATE lesson SET status = $2, version = version + 1, updated_at = now() WHERE topic_id = $1`,
    [topicId, status]
  );
  if (rowCount === 0) throw new ContentUploadError('LESSON_NOT_FOUND', `No lesson for topic ${topicId}`);
}

// --------------------------------------------------------------- questions

/**
 * Cross-topic question bank browse (the Admin Portal's Questions and
 * Question Review sections -- both the same QuestionsView component,
 * previously backed by mockAdminData/localStorage, not this). Unlike
 * listQuestionsByTopic (which GET /api/admin/questions?topic= already
 * used for a per-lesson editor view), this isn't scoped to one topic --
 * it's the "browse everything" list the bank UI needs, with the real
 * subject/chapter/topic names joined in for display.
 */
export async function listAllQuestions({ search, status, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const params = [];
  const where = [];

  if (status) {
    params.push(status);
    where.push(`q.status = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(q.prompt ILIKE $${params.length} OR t.name ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS n FROM question q JOIN topic t ON t.id = q.topic_id JOIN chapter c ON c.id = t.chapter_id JOIN subject s ON s.id = c.subject_id ${whereClause}`,
    params
  );

  params.push(safeLimit, safeOffset);
  const { rows } = await query(
    `SELECT q.id, q.topic_id, q.prompt, q.options, q.answer_index, q.explanation, q.trap,
            q.difficulty::float8 AS difficulty, q.estimated_seconds, q.status, q.source, q.source_year,
            q.created_at, q.updated_at,
            t.name AS topic_name, c.name AS chapter_name, s.id AS subject_id, s.name AS subject_name,
            (SELECT COUNT(*)::int FROM question_attempt a WHERE a.question_id = q.id) AS attempts_count,
            (SELECT COUNT(*) FILTER (WHERE a.correct)::int FROM question_attempt a WHERE a.question_id = q.id) AS correct_count
       FROM question q
       JOIN topic t ON t.id = q.topic_id
       JOIN chapter c ON c.id = t.chapter_id
       JOIN subject s ON s.id = c.subject_id
       ${whereClause}
      ORDER BY q.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    total: countRows[0]?.n ?? 0,
    questions: rows.map((r) => ({
      id: r.id,
      topicId: r.topic_id,
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      chapterName: r.chapter_name,
      topicName: r.topic_name,
      prompt: r.prompt,
      options: r.options,
      answerIndex: r.answer_index,
      explanation: r.explanation,
      trap: r.trap,
      difficulty: r.difficulty,
      estimatedSeconds: r.estimated_seconds,
      status: r.status,
      source: r.source,
      sourceYear: r.source_year,
      attemptsCount: Number(r.attempts_count),
      accuracyRate: Number(r.attempts_count) > 0 ? Math.round((Number(r.correct_count) / Number(r.attempts_count)) * 100) : 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  };
}

export async function listQuestionsByTopic(topicId) {
  const { rows } = await query(
    `SELECT q.id,q.topic_id,q.prompt,q.options,q.answer_index,q.explanation,q.trap,
            q.difficulty::float8 AS difficulty,q.estimated_seconds,q.status,q.source,
            q.source_year,q.exam_code,q.exam_group,q.paper,q.question_number,q.source_page,
            q.generation_source,(q.image_data IS NOT NULL) AS has_image,q.created_at,q.updated_at,
            t.name AS topic_name,c.name AS chapter_name,s.id AS subject_id,s.name AS subject_name
       FROM question q
       JOIN topic t ON t.id=q.topic_id
       JOIN chapter c ON c.id=t.chapter_id
       JOIN subject s ON s.id=c.subject_id
      WHERE q.topic_id=$1 ORDER BY q.updated_at DESC`,
    [topicId]
  );
  return rows.map((r) => ({
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
    source: r.source,
    sourceYear: r.source_year,
    examCode: r.exam_code,
    examGroup: r.exam_group,
    paper: r.paper,
    questionNumber: r.question_number,
    sourcePage: r.source_page,
    generationSource: r.generation_source,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    chapterName: r.chapter_name,
    topicName: r.topic_name,
    hasImage: r.has_image,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getQuestion(id) {
  const { rows } = await query(
    `SELECT q.id,q.topic_id,q.prompt,q.options,q.answer_index,q.explanation,q.trap,
            q.difficulty::float8 AS difficulty,q.estimated_seconds,q.status,q.source,
            q.source_year,q.exam_code,q.exam_group,q.paper,q.question_number,q.source_page,
            q.generation_source,q.created_at,q.updated_at,
            t.name AS topic_name,c.name AS chapter_name,s.id AS subject_id,s.name AS subject_name
       FROM question q JOIN topic t ON t.id=q.topic_id
       JOIN chapter c ON c.id=t.chapter_id JOIN subject s ON s.id=c.subject_id
      WHERE q.id=$1`,
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
    source: r.source,
    sourceYear: r.source_year,
    examCode: r.exam_code,
    examGroup: r.exam_group,
    paper: r.paper,
    questionNumber: r.question_number,
    sourcePage: r.source_page,
    generationSource: r.generation_source,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    chapterName: r.chapter_name,
    topicName: r.topic_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createQuestion({ topicId, prompt, options, answerIndex, explanation, trap, difficulty, estimatedSeconds, language, status = 'DRAFT' }) {
  if (!topicId || !prompt || !Array.isArray(options) || options.length < 2 || !explanation) {
    throw new ContentUploadError('MISSING_FIELDS', 'topicId, prompt, at least 2 options and explanation are required');
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
    throw new ContentUploadError('INVALID_ANSWER', 'answerIndex must be a valid option index');
  }
  if (!['DRAFT', 'IN_REVIEW', 'PUBLISHED'].includes(status)) {
    throw new ContentUploadError('INVALID_STATUS', 'New questions can only be created as DRAFT, IN_REVIEW, or PUBLISHED');
  }
  const cleanOptions = options.map((option) => String(option ?? '').trim());
  if (cleanOptions.some((option) => !option) || new Set(cleanOptions.map(normalize)).size !== cleanOptions.length) {
    throw new ContentUploadError('INVALID_OPTIONS', 'Options must be non-empty and unique');
  }
  const { rows: topicRows } = await query('SELECT id FROM topic WHERE id = $1', [topicId]);
  if (topicRows.length === 0) throw new ContentUploadError('TOPIC_NOT_FOUND', `No topic ${topicId}`);

  const id = `manual-${crypto.randomUUID().slice(0, 12)}`;
  const hash = crypto.createHash('sha256').update(normalize(prompt)).digest('hex');
  await query(
    `INSERT INTO question (id,topic_id,language,prompt,options,answer_index,explanation,trap,difficulty,estimated_seconds,source,status,normalized_hash,generation_source)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,'admin-manual',$11,$12,'manual')`,
    [id,topicId,language ?? 'en',prompt,JSON.stringify(cleanOptions),answerIndex,explanation,trap ?? null,difficulty ?? 0.3,estimatedSeconds ?? 45,status,hash]
  );
  return id;
}

const QUESTION_STATUSES = new Set(['DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED']);

// The Admin Portal's QuestionsView editor was built against a richer
// status vocabulary (DRAFT/IN_REVIEW/APPROVED/PUBLISHED/REJECTED/ARCHIVED)
// than question.status actually supports (question_status_ck:
// DRAFT/REVIEWED/PUBLISHED/ARCHIVED) -- there's no separate "approved"
// state and no "rejected" state in the schema. Translated honestly rather
// than widening the CHECK constraint for a distinction the rest of the
// system doesn't act on: IN_REVIEW/APPROVED -> REVIEWED (the real
// pre-publish state), REJECTED -> ARCHIVED (rejected content must not stay
// live, and ARCHIVED is the real "not live" state -- the one real status
// this collapses into is ambiguous on read, which is disclosed via
// rejectionReason staying unset rather than a lossless round-trip).
const QUESTION_STATUS_ALIASES = { IN_REVIEW: 'REVIEWED', APPROVED: 'REVIEWED', REJECTED: 'ARCHIVED' };

export async function updateQuestion(id, { prompt, options, answerIndex, explanation, trap, difficulty, estimatedSeconds, status }) {
  const existing = await getQuestion(id);
  if (!existing) throw new ContentUploadError('QUESTION_NOT_FOUND', `No question ${id}`);

  const nextOptions = options ?? existing.options;
  const nextAnswerIndex = answerIndex ?? existing.answerIndex;
  if (status !== undefined && !['DRAFT', 'IN_REVIEW', 'REVIEWED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'].includes(status)) {
    throw new ContentUploadError('INVALID_STATUS', 'Unsupported question status');
  }
  const cleanOptions = nextOptions.map((option) => String(option ?? '').trim());
  if (cleanOptions.some((option) => !option) || new Set(cleanOptions.map(normalize)).size !== cleanOptions.length) {
    throw new ContentUploadError('INVALID_OPTIONS', 'Options must be non-empty and unique');
  }
  if (!Number.isInteger(nextAnswerIndex) || nextAnswerIndex < 0 || nextAnswerIndex >= cleanOptions.length) {
    throw new ContentUploadError('INVALID_ANSWER', 'answerIndex must be a valid option index');
  }
  const nextPrompt = prompt ?? existing.prompt;
  const hash = crypto.createHash('sha256').update(normalize(nextPrompt)).digest('hex');

  let nextStatus = existing.status;
  if (status !== undefined) {
    nextStatus = QUESTION_STATUS_ALIASES[status] ?? status;
    if (!QUESTION_STATUSES.has(nextStatus)) {
      throw new ContentUploadError('INVALID_STATUS', `status must be one of ${[...QUESTION_STATUSES].join(', ')} (or an alias: ${Object.keys(QUESTION_STATUS_ALIASES).join(', ')})`);
    }
  }

  await query(
    `UPDATE question SET
       prompt = $2, options = $3::jsonb, answer_index = $4, explanation = $5, trap = $6,
       difficulty = $7, estimated_seconds = $8, status = $9, normalized_hash = $10, updated_at = now()
     WHERE id = $1`,
    [
      id,
      nextPrompt,
      JSON.stringify(cleanOptions),
      nextAnswerIndex,
      explanation ?? existing.explanation,
      trap !== undefined ? trap : existing.trap,
      difficulty ?? existing.difficulty,
      estimatedSeconds ?? existing.estimatedSeconds,
      nextStatus,
      hash,
    ]
  );
}

export async function deleteQuestion(id) {
  const { rowCount } = await query('DELETE FROM question WHERE id = $1', [id]);
  if (rowCount === 0) throw new ContentUploadError('QUESTION_NOT_FOUND', `No question ${id}`);
}

// ----------------------------------------------------------- test templates

/**
 * A template composes its questions one of two ways: `topics` (an array of
 * {topicId, targetCount}) for the original topic-weighted random
 * generation -- a fresh pick from each topic every time a learner attempts
 * it -- or `questionIds` (an array of real question ids) for the Test
 * Builder's hand-picked exam-paper model, served verbatim and in order.
 * Both can't be meaningfully combined (picking is all-or-nothing per
 * template), so whichever is provided replaces the template's composition
 * entirely; the real generation endpoint (/api/tests POST) prefers an
 * explicit question list when one exists, falling back to topic-weighted
 * picking otherwise -- see pickTemplateQuestions there.
 */
export async function listTestTemplates() {
  const { rows } = await query(`
    SELECT tt.id, tt.name, tt.description, tt.question_count, tt.active, tt.created_at, tt.updated_at,
           tt.subject_name, tt.test_type, tt.duration_minutes, tt.marks_per_question::float8 AS marks_per_question,
           tt.negative_marks::float8 AS negative_marks, tt.passing_threshold_percent::float8 AS passing_threshold_percent,
           tt.proctoring_policy_id, tt.proctoring_policy_name,
           COALESCE(topics.agg, '[]') AS topics,
           COALESCE(questions.agg, '[]') AS question_ids,
           COALESCE(stats.total_attempts, 0) AS total_attempts,
           COALESCE(stats.avg_score, 0) AS avg_score,
           COALESCE(stats.passed_count, 0) AS passed_count
      FROM test_template tt
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('topicId', ttt.topic_id, 'topicName', t.name, 'targetCount', ttt.target_count)) AS agg
          FROM test_template_topic ttt JOIN topic t ON t.id = ttt.topic_id WHERE ttt.template_id = tt.id
      ) topics ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(ttq.question_id ORDER BY ttq.sort_order) AS agg
          FROM test_template_question ttq WHERE ttq.template_id = tt.id
      ) questions ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS total_attempts, AVG(te.score)::float8 AS avg_score,
               COUNT(*) FILTER (WHERE te.score >= tt.passing_threshold_percent)::int AS passed_count
          FROM test te WHERE te.template_id = tt.id AND te.status = 'COMPLETED'
      ) stats ON true
     ORDER BY tt.created_at DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    questionCount: r.question_count,
    active: r.active,
    subjectName: r.subject_name,
    testType: r.test_type,
    durationMinutes: r.duration_minutes,
    marksPerQuestion: r.marks_per_question,
    negativeMarks: r.negative_marks,
    passingThresholdPercent: r.passing_threshold_percent,
    proctoringPolicyId: r.proctoring_policy_id,
    proctoringPolicyName: r.proctoring_policy_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    topics: r.topics,
    questionIds: r.question_ids,
    totalAttempts: Number(r.total_attempts),
    avgScore: Number(r.avg_score),
    passRate: Number(r.total_attempts) > 0 ? Math.round((Number(r.passed_count) / Number(r.total_attempts)) * 100) : 0,
  }));
}

const TEST_TEMPLATE_FIELDS = ['subjectName', 'testType', 'durationMinutes', 'marksPerQuestion', 'negativeMarks', 'passingThresholdPercent', 'proctoringPolicyId', 'proctoringPolicyName'];
const TEST_TEMPLATE_COLUMNS = ['subject_name', 'test_type', 'duration_minutes', 'marks_per_question', 'negative_marks', 'passing_threshold_percent', 'proctoring_policy_id', 'proctoring_policy_name'];

async function setTemplateComposition(templateId, { topics, questionIds }) {
  if (Array.isArray(topics)) {
    for (const t of topics) {
      if (!t.topicId || !Number.isInteger(t.targetCount) || t.targetCount <= 0) {
        throw new ContentUploadError('INVALID_TOPIC', 'Each topic needs a topicId and a positive targetCount');
      }
    }
    await query('DELETE FROM test_template_topic WHERE template_id = $1', [templateId]);
    await query('DELETE FROM test_template_question WHERE template_id = $1', [templateId]);
    for (const t of topics) {
      await query('INSERT INTO test_template_topic (template_id, topic_id, target_count) VALUES ($1, $2, $3)', [templateId, t.topicId, t.targetCount]);
    }
    const questionCount = topics.reduce((sum, t) => sum + t.targetCount, 0);
    await query('UPDATE test_template SET question_count = $2 WHERE id = $1', [templateId, questionCount]);
  } else if (Array.isArray(questionIds)) {
    if (questionIds.length === 0) throw new ContentUploadError('MISSING_QUESTIONS', 'At least one question must be selected');
    const { rows: validRows } = await query('SELECT id FROM question WHERE id = ANY($1::text[])', [questionIds]);
    const validIds = new Set(validRows.map((r) => r.id));
    const unknown = questionIds.filter((id) => !validIds.has(id));
    if (unknown.length) throw new ContentUploadError('QUESTION_NOT_FOUND', `Unknown question id(s): ${unknown.join(', ')}`);

    await query('DELETE FROM test_template_topic WHERE template_id = $1', [templateId]);
    await query('DELETE FROM test_template_question WHERE template_id = $1', [templateId]);
    for (const [index, qid] of questionIds.entries()) {
      await query('INSERT INTO test_template_question (template_id, question_id, sort_order) VALUES ($1, $2, $3)', [templateId, qid, index]);
    }
    await query('UPDATE test_template SET question_count = $2 WHERE id = $1', [templateId, questionIds.length]);
  }
}

export async function createTestTemplate({ name, description, topics, questionIds, ...rest }) {
  if (!name) throw new ContentUploadError('MISSING_FIELDS', 'name is required');
  const hasTopics = Array.isArray(topics) && topics.length > 0;
  const hasQuestions = Array.isArray(questionIds) && questionIds.length > 0;
  if (!hasTopics && !hasQuestions) {
    throw new ContentUploadError('MISSING_FIELDS', 'Provide either topics (topic-weighted) or questionIds (hand-picked)');
  }

  const setCols = [];
  const setVals = [];
  TEST_TEMPLATE_FIELDS.forEach((field, i) => {
    if (rest[field] !== undefined) {
      setCols.push(TEST_TEMPLATE_COLUMNS[i]);
      setVals.push(rest[field]);
    }
  });

  const initialQuestionCount = hasTopics ? topics.reduce((sum, t) => sum + (Number(t.targetCount) || 0), 0) : questionIds.length;
  const insertCols = ['name', 'description', 'question_count', ...setCols];
  const insertVals = [name, description ?? null, initialQuestionCount, ...setVals];
  const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(`INSERT INTO test_template (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING id`, insertVals);
  const templateId = rows[0].id;

  await setTemplateComposition(templateId, { topics, questionIds });
  return templateId;
}

export async function updateTestTemplate(id, { name, description, active, topics, questionIds, ...rest }) {
  const { rows } = await query('SELECT id FROM test_template WHERE id = $1', [id]);
  if (rows.length === 0) throw new ContentUploadError('TEMPLATE_NOT_FOUND', `No test template ${id}`);

  if (topics !== undefined || questionIds !== undefined) {
    await setTemplateComposition(id, { topics, questionIds });
  }

  const setClauses = ['name = COALESCE($2, name)', 'description = COALESCE($3, description)', 'active = COALESCE($4, active)', 'updated_at = now()'];
  const values = [id, name ?? null, description ?? null, active ?? null];
  TEST_TEMPLATE_FIELDS.forEach((field, i) => {
    if (rest[field] !== undefined) {
      values.push(rest[field]);
      setClauses.push(`${TEST_TEMPLATE_COLUMNS[i]} = $${values.length}`);
    }
  });

  await query(`UPDATE test_template SET ${setClauses.join(', ')} WHERE id = $1`, values);
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
