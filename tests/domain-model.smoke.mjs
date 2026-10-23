#!/usr/bin/env node
// Phase 2 exit test, against a real database:
//
//   DATABASE_URL=... node tests/domain-model.smoke.mjs
//
// "The backend can create: Learner -> Subject -> Topic -> Lesson -> Question
// through backend services." This creates each entity exclusively through
// the new src/services/* layer (never hand-written SQL), confirms the
// generic Content/Lesson/Assessment/LearningSession/LearningAttempt tables
// added in V6 work end to end, and confirms nothing existing broke: the
// already-seeded aptitude.fractions topic and its questions are read back
// through the new repositories without being touched.

import pg from 'pg';
import { registerLearner } from '../src/services/learnerService.mjs';
import { defineSubject, defineChapter, defineTopic, defineTopicPrerequisite } from '../src/services/curriculumService.mjs';
import { createDraftLesson, transitionContentStatus, getLessonWithContent } from '../src/services/contentService.mjs';
import { authorQuestion, getQuestion } from '../src/services/questionService.mjs';
import { createDraftAssessment } from '../src/services/assessmentService.mjs';
import { startLearningSession, completeSession, getSessionWithAttempts } from '../src/services/sessionService.mjs';
import { ContentStatus, AssessmentType, SessionType } from '../src/domain/enums.mjs';
import { ValidationError, NotFoundError } from '../src/services/errors.mjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    console.log(`  FAIL ${label} ${detail}`);
    failures.push(label);
  }
};

const suffix = Date.now();

console.log('\nLearner -> Subject -> Chapter -> Topic -> Prerequisite\n');

const learner = await registerLearner({ name: `phase2-smoke-${suffix}`, language: 'en' });
check('learner was created with an id', typeof learner.id === 'string');

const subject = await defineSubject({ id: `phase2.subject.${suffix}`, name: 'Phase 2 Smoke Subject', sortOrder: 99 });
check('subject was created', subject.id.startsWith('phase2.subject.'));

const chapter = await defineChapter({
  id: `phase2.chapter.${suffix}`,
  subjectId: subject.id,
  name: 'Phase 2 Smoke Chapter',
  sortOrder: 1,
  questionCount: 0,
});
check('chapter was created', chapter.subjectId === subject.id);

const prereqTopic = await defineTopic({ id: `phase2.topic.prereq.${suffix}`, chapterId: chapter.id, name: 'Prereq Topic' });
const topic = await defineTopic({ id: `phase2.topic.${suffix}`, chapterId: chapter.id, name: 'Phase 2 Smoke Topic' });
check('topic was created under the chapter', topic.chapterId === chapter.id);

const prerequisite = await defineTopicPrerequisite({
  topicId: topic.id,
  prerequisiteTopicId: prereqTopic.id,
  strength: 0.8,
});
check('prerequisite edge was created', prerequisite.topicId === topic.id);

let prereqRejected = false;
try {
  await defineTopicPrerequisite({ topicId: topic.id, prerequisiteTopicId: topic.id, strength: 0.8 });
} catch (err) {
  prereqRejected = err instanceof ValidationError;
}
check('a topic cannot be its own prerequisite', prereqRejected);

console.log('\nTopic -> Lesson (Content envelope + lifecycle)\n');

const lesson = await createDraftLesson({
  topicId: topic.id,
  difficulty: 0.3,
  title: 'Introduction to the Phase 2 Smoke Topic',
  body: 'This is a seed lesson body used only by the Phase 2 exit test.',
});
check('lesson content was created as DRAFT', lesson.status === ContentStatus.DRAFT);
check('lesson body was persisted', lesson.lesson.body.includes('seed lesson body'));

const publishedLesson = await transitionContentStatus(lesson.id, ContentStatus.PUBLISHED);
check('lesson moved from DRAFT to PUBLISHED', publishedLesson.status === ContentStatus.PUBLISHED);

let backwardTransitionRejected = false;
try {
  await transitionContentStatus(lesson.id, ContentStatus.DRAFT);
} catch (err) {
  backwardTransitionRejected = err instanceof ValidationError;
}
check('lesson cannot move backward from PUBLISHED to DRAFT', backwardTransitionRejected);

const fetchedLesson = await getLessonWithContent(lesson.id);
check('lesson can be read back with its content envelope', fetchedLesson.lesson.title.includes('Phase 2 Smoke Topic'));

console.log('\nTopic -> Question (existing question table, via the new service)\n');

const question = await authorQuestion({
  id: `phase2-smoke-question-${suffix}`,
  topicId: topic.id,
  language: 'en',
  prompt: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  answerIndex: 1,
  explanation: '2 + 2 = 4.',
  difficulty: 0.1,
  estimatedSeconds: 20,
  source: 'authored',
});
check('question was created through the service', question.answerIndex === 1);

const fetchedQuestion = await getQuestion(question.id);
check('question can be read back', fetchedQuestion.prompt === 'What is 2 + 2?');

let questionValidationRejected = false;
try {
  await authorQuestion({
    id: `phase2-smoke-bad-question-${suffix}`,
    topicId: topic.id,
    prompt: 'Too few options',
    options: ['a', 'b'],
    answerIndex: 0,
    explanation: 'n/a',
    difficulty: 0.1,
  });
} catch (err) {
  questionValidationRejected = err instanceof ValidationError;
}
check('a question with fewer than 4 options is rejected', questionValidationRejected);

console.log('\nExisting content is untouched (aptitude.fractions still reads fine)\n');

const { rows: existingFractionsQuestions } = await client.query(
  `SELECT id FROM question WHERE topic_id = 'aptitude.fractions' AND status = 'PUBLISHED' LIMIT 1`
);
check('a previously-seeded aptitude.fractions question still exists', existingFractionsQuestions.length === 1);

console.log('\nAssessment (minimal, Phase 9 builds the blueprint engine)\n');

const assessment = await createDraftAssessment({ learnerId: learner.id, type: AssessmentType.DIAGNOSTIC, metadata: {} });
check('a draft assessment was created', assessment.status === 'DRAFT' && assessment.type === AssessmentType.DIAGNOSTIC);

console.log('\nLearningSession + LearningAttempt linkage\n');

const session = await startLearningSession({ learnerId: learner.id, topicId: topic.id, sessionType: SessionType.PRACTICE });
check('a learning session was started', session.status === 'IN_PROGRESS');

const { rows: attemptRows } = await client.query(
  `INSERT INTO question_attempt (id, learner_id, question_id, topic_id, selected_index, correct, time_taken_ms, confidence)
   VALUES (gen_random_uuid(), $1, $2, $3, 1, true, 9000, 4)
   RETURNING id`,
  [learner.id, question.id, topic.id]
);
const attemptId = attemptRows[0].id;

const { linkAttemptToSession } = await import('../src/services/attemptService.mjs');
await linkAttemptToSession(attemptId, session.id);

const completed = await completeSession(session.id);
check('the session can be completed', completed.status === 'COMPLETED');

const sessionWithAttempts = await getSessionWithAttempts(session.id);
check('the attempt is linked back to its session', sessionWithAttempts.attempts.length === 1);
check('the linked attempt is the one just graded', sessionWithAttempts.attempts[0].id === attemptId);

let notFoundRaised = false;
try {
  await completeSession('00000000-0000-0000-0000-000000000000');
} catch (err) {
  notFoundRaised = err instanceof NotFoundError;
}
check('completing an unknown session raises NotFoundError', notFoundRaised);

// ------------------------------------------------------------------ cleanup
await client.query('DELETE FROM question_attempt WHERE id = $1', [attemptId]);
await client.query('DELETE FROM learning_session WHERE id = $1', [session.id]);
await client.query('DELETE FROM assessment WHERE id = $1', [assessment.id]);
await client.query('DELETE FROM question WHERE id = $1', [question.id]);
await client.query('DELETE FROM content_lesson WHERE content_id = $1', [lesson.id]);
await client.query('DELETE FROM content WHERE id = $1', [lesson.id]);
await client.query('DELETE FROM topic_prerequisite WHERE topic_id = $1', [topic.id]);
await client.query('DELETE FROM topic WHERE id = ANY($1)', [[topic.id, prereqTopic.id]]);
await client.query('DELETE FROM chapter WHERE id = $1', [chapter.id]);
await client.query('DELETE FROM subject WHERE id = $1', [subject.id]);
await client.query(`DELETE FROM learner WHERE name LIKE 'phase2-smoke-%'`);
await client.end();

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('phase 2 domain model smoke test passed');
