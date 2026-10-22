import { env } from './env.mjs';
import { query, LEARNER_ID } from './db.mjs';
import { examWeight, selectTopic, weakestPrerequisite } from '../domain/selection.mjs';
import { buildDailyPlan } from '../domain/planner.mjs';
import { sendEmailToLearner } from './email.mjs';

// Rotated so a learner getting these every few hours doesn't see the exact
// same sentence twice in a row -- the plan content underneath is always
// real, only the framing around it varies.
const OPENERS = [
  "Quick nudge — ",
  "Still time today — ",
  "A small win is waiting — ",
  "Two minutes is enough to start — ",
  "Momentum check — ",
  "Your streak is counting on this — ",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Builds today's plan the same way GET /api/plan/today does. Duplicated
 * rather than importing the route handler -- route files aren't meant to
 * be called as functions, and this is the only other caller.
 */
async function getTodayPlan(learnerId) {
  const [{ rows: chapters }, { rows: topics }, { rows: states }, { rows: edges }, { rows: withContent }, { rows: dueCountRows }] =
    await Promise.all([
      query(
        `SELECT c.id AS chapter_id, c.question_count, COUNT(t.id)::int AS topic_count
           FROM chapter c JOIN topic t ON t.chapter_id = c.id
          GROUP BY c.id, c.question_count`
      ),
      query(`SELECT id, name, chapter_id FROM topic`),
      query(
        `SELECT topic_id, accuracy_score::float8 AS accuracy, attempt_count
           FROM learner_topic_state WHERE learner_id = $1`,
        [learnerId]
      ),
      query(`SELECT topic_id, prerequisite_topic_id, strength::float8 AS strength FROM topic_prerequisite`),
      query(`SELECT DISTINCT topic_id FROM question WHERE status = 'PUBLISHED'`),
      query(
        `SELECT COUNT(*)::int AS n FROM revision_schedule WHERE learner_id = $1 AND scheduled_at <= now()`,
        [learnerId]
      ),
    ]);

  const chapterById = new Map(chapters.map((c) => [c.chapter_id, c]));
  const maxChapterQuestionCount = Math.max(1, ...chapters.map((c) => c.question_count));
  const stateByTopic = new Map(states.map((s) => [s.topic_id, s]));
  const topicsWithContent = new Set(withContent.map((w) => w.topic_id));

  const graph = new Map();
  for (const edge of edges) {
    if (!graph.has(edge.topic_id)) graph.set(edge.topic_id, []);
    graph.get(edge.topic_id).push({ id: edge.prerequisite_topic_id, strength: edge.strength });
  }
  const accuracyByTopic = new Map(states.map((s) => [s.topic_id, s.accuracy]));

  const candidates = topics
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
        examWeight: chapter ? examWeight(chapter.question_count, chapter.topic_count, maxChapterQuestionCount) : 0,
        prerequisiteGap: weakest ? 1 - weakest.accuracy : 0,
      };
    });

  const selectedTopic = selectTopic(candidates);
  const revisionDueCount = dueCountRows[0]?.n ?? 0;
  return buildDailyPlan({ topics: candidates, revisionDueCount, selectedTopic });
}

/**
 * Sends one engagement email built from today's real plan -- never
 * generic filler. If there's genuinely nothing to recommend yet (brand
 * new learner, empty content bank), it still sends an honest "let's get
 * started" nudge rather than skipping silently.
 */
export async function sendEngagementEmail(learnerId = LEARNER_ID) {
  const plan = await getTodayPlan(learnerId);
  const opener = pick(OPENERS);

  let subject;
  let line;
  if (plan.primaryAction === 'MEMORY_ECHO') {
    subject = `${plan.revisionDue} topic${plan.revisionDue === 1 ? '' : 's'} are fading — rescue ${plan.revisionDue === 1 ? 'it' : 'them'}`;
    line = `${opener}${plan.reason}. A quick review now is what keeps it from slipping further.`;
  } else if (plan.primaryAction === 'PRACTICE') {
    subject = `${plan.reason}`;
    line = `${opener}${plan.reason}. About ${plan.estimatedMinutes} minutes gets you through ten questions.`;
  } else {
    subject = 'Ready when you are';
    line = `${opener}there's a full syllabus waiting and nothing studied yet today. Even one topic started today counts.`;
  }

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1E1B16; background: #FAF7F2;">
      <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6B6459; margin: 0 0 12px;">Yash</p>
      <h2 style="font-size: 22px; margin: 0 0 16px; line-height: 1.3;">${subject}</h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${line}</p>
      <a href="${env.appUrl || 'http://localhost:3000'}"
         style="display: inline-block; background: #2F3192; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Open the app
      </a>
    </div>`;

  return sendEmailToLearner(learnerId, { subject, text: line, html });
}
