import { randomUUID } from 'crypto';
import { makeRng } from './rng.mjs';
import { TEMPLATES } from './templates.mjs';
import { validateQuestion } from '../contentValidation.mjs';
import { query, pool } from '../db.mjs';

export { TEMPLATES };

export class TemplateGenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Generates `count` candidate questions from one template, validates each
 * (math is already guaranteed by the template's solver -- this checks
 * well-formedness, syllabus match and duplicates), and inserts the ones
 * that pass as a PENDING review batch. Nothing becomes visible to a
 * learner until an admin approves the batch (POST .../review/[id]/approve)
 * -- see content_review_batch in V21.
 *
 * @param {string} templateId key into TEMPLATES
 * @param {number} count how many to attempt (duplicates/failures are skipped, so the batch can be smaller)
 * @param {number} [seed] for reproducible generation; defaults to a random run
 * @returns {Promise<{batchId: string, generated: number, rejected: number, avgQualityScore: number}>}
 */
export async function generateTemplatedBatch(templateId, count, seed = Date.now()) {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new TemplateGenerationError('UNKNOWN_TEMPLATE', `No template "${templateId}". Known: ${Object.keys(TEMPLATES).join(', ')}`);
  }

  const { rows: topicRows } = await query(`SELECT id FROM topic WHERE id = $1`, [template.topicId]);
  const topicExists = topicRows.length > 0;
  if (!topicExists) {
    throw new TemplateGenerationError('TOPIC_NOT_FOUND', `Template "${templateId}" targets topic ${template.topicId}, which doesn't exist yet.`);
  }

  const { rows: hashRows } = await query(`SELECT normalized_hash FROM question WHERE language = 'en'`);
  const existingHashes = new Set(hashRows.map((r) => r.normalized_hash));

  const rng = makeRng(seed);
  const accepted = [];
  let rejected = 0;

  // Attempt up to 3x the target count -- random params occasionally repeat
  // (small pools like percentage choices) and land on an existing hash.
  const maxAttempts = count * 3;
  for (let i = 0; i < maxAttempts && accepted.length < count; i += 1) {
    const candidate = template.generate(rng);
    const result = validateQuestion(
      { ...candidate, topicExists },
      existingHashes
    );
    if (result.passed) {
      accepted.push({ candidate, result });
      existingHashes.add(result.hash); // so this run doesn't accept two near-identical candidates
    } else {
      rejected += 1;
    }
  }

  if (accepted.length === 0) {
    throw new TemplateGenerationError('NO_VALID_QUESTIONS', 'Every generated candidate failed validation -- try a different template or raise the attempt count.');
  }

  const client = await pool.connect();
  const questionIds = [];
  try {
    await client.query('BEGIN');
    for (const { candidate, result } of accepted) {
      const id = `${templateId}-${randomUUID().slice(0, 8)}`;
      await client.query(
        `INSERT INTO question (
           id, topic_id, language, prompt, options, answer_index, explanation, trap,
           difficulty, estimated_seconds, source, status, normalized_hash,
           subtopic, question_type, skills_required, shortcut, common_mistake,
           quality_score, generation_source
         ) VALUES ($1,$2,'en',$3,$4::jsonb,$5,$6,$7,$8,$9,'template','DRAFT',$10,$11,$12,$13::jsonb,$14,$15,$16,'template')`,
        [
          id,
          template.topicId,
          candidate.prompt,
          JSON.stringify(candidate.options),
          candidate.answerIndex,
          candidate.explanation,
          candidate.commonMistake ?? null,
          candidate.difficulty,
          candidate.estimatedSeconds,
          result.hash,
          template.subtopic,
          template.questionType,
          JSON.stringify(template.skillsRequired),
          candidate.shortcut ?? null,
          candidate.commonMistake ?? null,
          result.score,
        ]
      );
      questionIds.push(id);
    }

    const avgQualityScore = accepted.reduce((s, a) => s + a.result.score, 0) / accepted.length;
    const { rows: batchRows } = await client.query(
      `INSERT INTO content_review_batch (topic_id, generation_source, question_ids, avg_quality_score)
       VALUES ($1, 'template', $2::jsonb, $3) RETURNING id`,
      [template.topicId, JSON.stringify(questionIds), Math.round(avgQualityScore * 1000) / 1000]
    );

    await client.query('COMMIT');
    return {
      batchId: batchRows[0].id,
      generated: accepted.length,
      rejected,
      avgQualityScore: Math.round(avgQualityScore * 1000) / 1000,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
