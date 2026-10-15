import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { examWeight, selectTopic, weakestPrerequisite } from '../../../../domain/selection.mjs';
import { masteryState } from '../../../../domain/mastery.mjs';
import { recommendedAction } from '../../../../domain/recommendedAction.mjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/learn/overview
 *
 * The full syllabus tree (subjects → chapters → topics) joined with
 * mastery, revision-due status and the current recommendation — one
 * request instead of the five separate queries a Learn page would
 * otherwise need. Aggregates, doesn't replace: /api/plan/today,
 * /api/revision/due and /api/questions/next all still work standalone and
 * this reuses their exact query/domain-function patterns rather than
 * introducing new ones.
 *
 * No frontend reads this yet — /proto/learn/* still renders its design
 * mock (it shows 10 subjects; only Aptitude & Mental Ability has real
 * published questions today, Polity has topics with none, and the two
 * language subjects have no topics at all — see docs/frontend-backend-
 * inventory.md). This endpoint reports that reality honestly rather than
 * hiding the gaps, so whenever Learn's content work lands, the API is
 * already there.
 */
export async function GET() {
  try {
    const [
      { rows: subjects },
      { rows: chapters },
      { rows: topics },
      { rows: states },
      { rows: edges },
      { rows: bankCounts },
      { rows: dueRows },
    ] = await Promise.all([
      query(`SELECT id, name FROM subject ORDER BY sort_order`),
      query(`SELECT id, subject_id, name, question_count, sort_order FROM chapter ORDER BY sort_order`),
      query(`SELECT id, name, chapter_id, sort_order FROM topic ORDER BY sort_order`),
      query(
        `SELECT topic_id, accuracy_score::float8 AS accuracy, attempt_count, mastery_score::float8 AS mastery, next_action
           FROM learner_topic_state WHERE learner_id = $1`,
        [LEARNER_ID]
      ),
      query(`SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`),
      query(
        `SELECT topic_id, COUNT(*)::int AS n FROM question WHERE status = 'PUBLISHED' GROUP BY topic_id`
      ),
      query(
        `SELECT topic_id FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`,
        [LEARNER_ID]
      ),
    ]);

    const chaptersByTopicCount = new Map();
    for (const t of topics) {
      chaptersByTopicCount.set(t.chapter_id, (chaptersByTopicCount.get(t.chapter_id) ?? 0) + 1);
    }
    const maxChapterQuestionCount = Math.max(1, ...chapters.map((c) => c.question_count));

    const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
    const bankCountByTopic = new Map(bankCounts.map((b) => [b.topic_id, b.n]));
    const dueTopicIds = new Set(dueRows.map((r) => r.topic_id));
    const accuracyByTopic = new Map(states.map((s) => [s.topic_id, s.accuracy]));

    const graph = new Map();
    for (const edge of edges) {
      if (!graph.has(edge.topic_id)) graph.set(edge.topic_id, []);
      graph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
    }

    // Same candidate shape /api/plan/today builds, restricted to topics
    // that actually have published content — selectTopic needs that to
    // pick a sane recommendation.
    const topicsWithContent = new Set(bankCounts.map((b) => b.topic_id));
    const chapterById = new Map(chapters.map((c) => [c.id, c]));
    const recommendationCandidates = topics
      .filter((t) => topicsWithContent.has(t.id))
      .map((t) => {
        const chapter = chapterById.get(t.chapter_id);
        const state = stateByTopic.get(t.id);
        const weakest = weakestPrerequisite(t.id, graph, accuracyByTopic);
        return {
          id: t.id,
          name: t.name,
          accuracy: state?.accuracy ?? 0,
          attemptCount: state?.attempt_count ?? 0,
          examWeight: chapter
            ? examWeight(chapter.question_count, chaptersByTopicCount.get(chapter.id) ?? 1, maxChapterQuestionCount)
            : 0,
          prerequisiteGap: weakest ? 1 - weakest.accuracy : 0,
        };
      });
    const recommended = selectTopic(recommendationCandidates);

    const topicsByChapter = new Map();
    for (const t of topics) {
      if (!topicsByChapter.has(t.chapter_id)) topicsByChapter.set(t.chapter_id, []);
      topicsByChapter.get(t.chapter_id).push(t);
    }
    const chaptersBySubject = new Map();
    for (const c of chapters) {
      if (!chaptersBySubject.has(c.subject_id)) chaptersBySubject.set(c.subject_id, []);
      chaptersBySubject.get(c.subject_id).push(c);
    }

    const result = subjects.map((s) => ({
      subjectId: s.id,
      name: s.name,
      chapters: (chaptersBySubject.get(s.id) ?? []).map((c) => ({
        chapterId: c.id,
        name: c.name,
        examQuestionCount: c.question_count,
        topics: (topicsByChapter.get(c.id) ?? []).map((t) => {
          const state = stateByTopic.get(t.id);
          const bankQuestionCount = bankCountByTopic.get(t.id) ?? 0;
          const attemptCount = state?.attempt_count ?? 0;
          const mastery = state?.mastery ?? 0;
          const revisionDue = dueTopicIds.has(t.id);
          return {
            topicId: t.id,
            name: t.name,
            bankQuestionCount,
            attemptCount,
            accuracy: state?.accuracy ?? 0,
            masteryScore: mastery,
            revisionDue,
            isRecommended: recommended?.id === t.id,
            state: masteryState(mastery, attemptCount, bankQuestionCount),
            recommendedAction: bankQuestionCount
              ? recommendedAction({ revisionDue, started: attemptCount > 0, nextAction: state?.next_action })
              : null,
          };
        }),
      })),
    }));

    return NextResponse.json({ subjects: result, recommendedTopicId: recommended?.id ?? null });
  } catch (err) {
    return NextResponse.json({ code: 'LEARN_OVERVIEW_FAILED', message: err.message }, { status: 500 });
  }
}
