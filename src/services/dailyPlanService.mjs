import { query } from '../lib/db.mjs';
import { examWeight, selectTopic, weakestPrerequisite } from '../domain/selection.mjs';

/**
 * Shared learner-topic selection for every "what should I do next?" surface.
 * The dashboard plan and the dedicated next-action API must never disagree
 * because they independently rank topics with different SQL.
 */
export async function selectDailyTopicForLearner(learnerId) {
  const [{ rows: chapters }, { rows: topics }, { rows: states }, { rows: edges }, { rows: withContent }, { rows: dueCountRows }, { rows: currentUnits }] =
    await Promise.all([
      query(`SELECT c.id AS chapter_id, c.question_count, COUNT(t.id)::int AS topic_count
               FROM chapter c JOIN topic t ON t.chapter_id = c.id
              GROUP BY c.id, c.question_count`),
      query(`SELECT id, name, chapter_id FROM topic`),
      query(`SELECT topic_id, accuracy_score::float8 AS accuracy, attempt_count
               FROM learner_topic_state WHERE learner_id = $1`, [learnerId]),
      query(`SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`),
      query(`SELECT DISTINCT topic_id FROM question WHERE status = 'PUBLISHED'`),
      query(`SELECT COUNT(*)::int AS n FROM revision_schedule
               WHERE learner_id = $1 AND status = 'SCHEDULED' AND scheduled_at <= now()`, [learnerId]),
      query(`SELECT u.id AS unit_id, u.topic_id FROM learner_curriculum lc JOIN learning_unit u ON u.day_id=lc.current_day_id WHERE lc.learner_id=$1 AND lc.curriculum_id='tnpsc-group-2-v1' AND u.topic_id IS NOT NULL`, [learnerId]),
    ]);

  const chapterById = new Map(chapters.map((c) => [c.chapter_id, c]));
  const maxChapterQuestionCount = Math.max(1, ...chapters.map((c) => Number(c.question_count || 0)));
  const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
  const topicsWithContent = new Set(withContent.map((w) => w.topic_id));
  const unitByTopic = new Map(currentUnits.map((u) => [u.topic_id, u.unit_id]));
  const graph = new Map();

  for (const edge of edges) {
    if (!graph.has(edge.topic_id)) graph.set(edge.topic_id, []);
    graph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: Number(edge.strength) });
  }

  const accuracyByTopic = new Map(states.map((s) => [s.topic_id, Number(s.accuracy || 0)]));
  const candidates = topics
    .filter((t) => topicsWithContent.has(t.id))
    .map((t) => {
      const chapter = chapterById.get(t.chapter_id);
      const state = stateByTopic.get(t.id);
      const weakest = weakestPrerequisite(t.id, graph, accuracyByTopic);
      return {
        id: t.id,
        name: t.name,
        accuracy: Number(state?.accuracy || 0),
        attemptCount: Number(state?.attempt_count || 0),
        examWeight: chapter ? examWeight(Number(chapter.question_count || 0), Number(chapter.topic_count || 0), maxChapterQuestionCount) : 0,
        prerequisiteGap: weakest ? 1 - weakest.accuracy : 0,
        unitId: unitByTopic.get(t.id) ?? null,
      };
    });

  return {
    candidates,
    selectedTopic: selectTopic(candidates),
    revisionDueCount: Number(dueCountRows[0]?.n || 0),
  };
}
