import { query } from './db.mjs';

export class ReportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const VALID_REASONS = new Set([
  'wrong_answer', 'wrong_explanation', 'unclear', 'multiple_correct',
  'no_correct_answer', 'outdated', 'typo', 'wrong_topic', 'duplicate', 'other',
]);

export function isValidReason(reason) {
  return VALID_REASONS.has(reason);
}

/** A learner reports a question. One open report per learner per question -- resubmitting just updates it. */
export async function reportQuestion({ learnerId, questionId, reason, description }) {
  const { rows: qRows } = await query(`SELECT id FROM question WHERE id = $1`, [questionId]);
  if (qRows.length === 0) throw new ReportError('QUESTION_NOT_FOUND', `No question ${questionId}`);

  await query(
    `INSERT INTO content_report (question_id, learner_id, reason, description)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [questionId, learnerId, reason, description ?? null]
  );
}

/**
 * The Support Center's queue: every PENDING report, grouped by question,
 * with the real attempt-accuracy signal alongside the report count -- a
 * question with a high report count AND low real accuracy is a much
 * stronger "this is actually wrong" signal than report count alone (a
 * popular easy question gets more total reports just from more traffic).
 */
export async function listPendingReports() {
  const { rows } = await query(`
    SELECT
      q.id AS question_id, q.prompt, q.options, q.answer_index, q.explanation, q.topic_id,
      t.name AS topic_name,
      COUNT(cr.id)::int AS report_count,
      array_agg(DISTINCT cr.reason) AS reasons,
      MAX(cr.created_at) AS last_reported_at,
      COALESCE(stats.attempts, 0)::int AS attempts,
      stats.accuracy
    FROM content_report cr
    JOIN question q ON q.id = cr.question_id
    JOIN topic t ON t.id = q.topic_id
    LEFT JOIN (
      SELECT question_id, COUNT(*)::int AS attempts,
             ROUND(100.0 * COUNT(*) FILTER (WHERE correct) / COUNT(*))::int AS accuracy
        FROM question_attempt
       GROUP BY question_id
    ) stats ON stats.question_id = q.id
    WHERE cr.status = 'PENDING'
    GROUP BY q.id, q.prompt, q.options, q.answer_index, q.explanation, q.topic_id, t.name, stats.attempts, stats.accuracy
    ORDER BY report_count DESC, last_reported_at DESC
  `);

  return rows.map((r) => ({
    questionId: r.question_id,
    prompt: r.prompt,
    options: r.options,
    answerIndex: r.answer_index,
    explanation: r.explanation,
    topicId: r.topic_id,
    topicName: r.topic_name,
    reportCount: r.report_count,
    reasons: r.reasons,
    lastReportedAt: r.last_reported_at,
    attempts: r.attempts,
    accuracy: r.accuracy,
    // A simple, legible priority signal rather than a opaque score: many
    // reports AND real learners failing it is worse than many reports on
    // a question most people still get right (could be a wording nit).
    highPriority: r.report_count >= 3 || (r.attempts >= 10 && r.accuracy !== null && r.accuracy < 40),
  }));
}

/** Every individual report for one question, for the detail view. */
export async function listReportsForQuestion(questionId) {
  const { rows } = await query(
    `SELECT cr.id, cr.reason, cr.description, cr.status, cr.created_at, l.name AS learner_name
       FROM content_report cr
       JOIN learner l ON l.id = cr.learner_id
      WHERE cr.question_id = $1
      ORDER BY cr.created_at DESC`,
    [questionId]
  );
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    learnerName: r.learner_name,
  }));
}

/**
 * Resolves every PENDING report on a question at once -- a reviewer fixes
 * the underlying question once, not report-by-report. `resolution` is
 * free text (e.g. "Corrected answer from C to B").
 */
export async function resolveReportsForQuestion({ questionId, resolution, dismiss = false }) {
  const { rowCount } = await query(
    `UPDATE content_report
        SET status = $2, resolution = $3, reviewed_at = now()
      WHERE question_id = $1 AND status = 'PENDING'`,
    [questionId, dismiss ? 'DISMISSED' : 'RESOLVED', resolution ?? null]
  );
  return { resolved: rowCount };
}
