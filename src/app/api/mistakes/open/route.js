import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { weakestPrerequisite } from '../../../../domain/selection.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mistakes/open
 *
 * Every still-open mistake, most recent first — the list behind the
 * mistake bank. Same CTE as /api/mistakes/next, just without the LIMIT 1:
 * no new classification logic, only more rows of what question_attempt
 * already recorded. Also attaches each mistake's next scheduled review (if
 * any) and its weakest prerequisite, using the same
 * weakestPrerequisite(topicId, graph, accuracyByTopic) /api/plan/today
 * already calls — not a new idea, just reused here too.
 */
export async function GET() {
  try {
    const [{ rows }, { rows: edges }, { rows: states }, { rows: topics }] = await Promise.all([
      query(
        `WITH wrong AS (
           SELECT DISTINCT ON (question_id) question_id, topic_id, mistake_type, created_at
             FROM question_attempt
            WHERE learner_id = $1 AND correct = false
            ORDER BY question_id, created_at DESC
         ),
         resolved AS (
           SELECT DISTINCT w.question_id
             FROM question_attempt qa
             JOIN wrong w ON w.question_id = qa.question_id
            WHERE qa.learner_id = $1 AND qa.correct = true AND qa.created_at > w.created_at
         )
         SELECT w.question_id, w.topic_id, w.mistake_type, w.created_at,
                t.name AS topic_name, q.prompt, rs.scheduled_at AS next_review
           FROM wrong w
           LEFT JOIN resolved r ON r.question_id = w.question_id
           JOIN topic t ON t.id = w.topic_id
           JOIN question q ON q.id = w.question_id
           LEFT JOIN revision_schedule rs ON rs.learner_id = $1 AND rs.topic_id = w.topic_id
          WHERE r.question_id IS NULL
          ORDER BY w.created_at DESC`,
        [LEARNER_ID]
      ),
      query(`SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`),
      query(
        `SELECT topic_id, accuracy_score::float8 AS accuracy FROM learner_topic_state WHERE learner_id = $1`,
        [LEARNER_ID]
      ),
      query(`SELECT id, name FROM topic`),
    ]);

    const graph = new Map();
    for (const edge of edges) {
      if (!graph.has(edge.topic_id)) graph.set(edge.topic_id, []);
      graph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
    }
    const accuracyByTopic = new Map(states.map((s) => [s.topic_id, s.accuracy]));
    const topicNameById = new Map(topics.map((t) => [t.id, t.name]));

    return NextResponse.json({
      items: rows.map((r) => {
        const weakest = weakestPrerequisite(r.topic_id, graph, accuracyByTopic);
        return {
          questionId: r.question_id,
          topicId: r.topic_id,
          topicName: r.topic_name,
          prompt: r.prompt,
          mistakeType: r.mistake_type,
          createdAt: r.created_at,
          nextReview: r.next_review,
          weakestPrerequisite: weakest
            ? { topicId: weakest.topicId, topicName: topicNameById.get(weakest.topicId) ?? weakest.topicId }
            : null,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ code: 'MISTAKES_OPEN_FAILED', message: err.message }, { status: 500 });
  }
}
