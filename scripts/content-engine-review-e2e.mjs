#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const port = Number(process.env.CONTENT_ENGINE_REVIEW_E2E_PORT ?? 3108);
const baseUrl = `http://127.0.0.1:${port}`;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function manifestHash(publicationId, items) {
  const canonical = canonicalize({ publication_id: publicationId, items: items.map((x) => ({ kind: x.kind, content_id: x.content_id, topic_id: x.topic_id, payload: x.payload })) });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

const db = new Client({ connectionString: databaseUrl });
await db.connect();
let server;
const created = {
  adminId: null, sessionHash: null,
  questionReviewerId: null, questionReviewerSessionHash: null,
  contentReviewerId: null, contentReviewerSessionHash: null,
  subjectExpertId: null, subjectExpertSessionHash: null,
  subjectExpertSubjectId: null,
  studentId: null, studentSessionHash: null,
  comparisonStudentId: null, comparisonStudentSessionHash: null,
  adaptiveDependentTopicId: null, adaptivePrerequisiteTopicId: null,
  publications: [], batches: [], questionIds: [], lessonIds: [],
  manualQuestionIds: [], reviewEvidenceResourceIds: [], lessonWorkflowTopicId: null,
};

try {
  const topicResult = await db.query(`SELECT t.id FROM topic t LEFT JOIN lesson l ON l.topic_id=t.id ORDER BY (l.topic_id IS NULL) DESC,t.id LIMIT 1`);
  assert.ok(topicResult.rows.length, 'a topic is required');
  const topicId = topicResult.rows[0].id;

  const adminId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  created.adminId = adminId;
  created.sessionHash = tokenHash(token);
  await db.query(`INSERT INTO learner(id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [adminId, 'Content Review E2E Admin']);
  await db.query(`INSERT INTO app_user(id, role, status, admin_role) VALUES ($1,'ADMIN','ACTIVE','super_admin')`, [adminId]);
  await db.query(`INSERT INTO user_session(user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [adminId, created.sessionHash]);

  const questionReviewerId = crypto.randomUUID();
  const questionReviewerToken = crypto.randomBytes(32).toString('hex');
  created.questionReviewerId = questionReviewerId;
  created.questionReviewerSessionHash = tokenHash(questionReviewerToken);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [questionReviewerId, 'Question Reviewer E2E']);
  await db.query(`INSERT INTO app_user(id,role,status,admin_role) VALUES ($1,'ADMIN','ACTIVE','question_reviewer')`, [questionReviewerId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [questionReviewerId, created.questionReviewerSessionHash]);

  const contentReviewerId = crypto.randomUUID();
  const contentReviewerToken = crypto.randomBytes(32).toString('hex');
  created.contentReviewerId = contentReviewerId;
  created.contentReviewerSessionHash = tokenHash(contentReviewerToken);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [contentReviewerId, 'Content Reviewer E2E']);
  await db.query(`INSERT INTO app_user(id,role,status,admin_role) VALUES ($1,'ADMIN','ACTIVE','content_reviewer')`, [contentReviewerId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [contentReviewerId, created.contentReviewerSessionHash]);

  const scopedSubject = await db.query(
    `SELECT c.subject_id FROM topic t JOIN chapter c ON c.id=t.chapter_id WHERE t.id=$1`,
    [topicId]
  );
  assert.ok(scopedSubject.rows.length, 'the main test topic must belong to a subject');
  created.subjectExpertSubjectId = scopedSubject.rows[0].subject_id;
  const outOfScopeTopic = await db.query(
    `SELECT t.id FROM topic t JOIN chapter c ON c.id=t.chapter_id WHERE c.subject_id<>$1 ORDER BY t.id LIMIT 1`,
    [created.subjectExpertSubjectId]
  );
  assert.ok(outOfScopeTopic.rows.length, 'a topic in a different subject is required for scope tests');
  const otherTopicId = outOfScopeTopic.rows[0].id;

  const subjectExpertId = crypto.randomUUID();
  const subjectExpertToken = crypto.randomBytes(32).toString('hex');
  created.subjectExpertId = subjectExpertId;
  created.subjectExpertSessionHash = tokenHash(subjectExpertToken);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [subjectExpertId, 'Subject Expert E2E']);
  await db.query(`INSERT INTO app_user(id,role,status,admin_role) VALUES ($1,'ADMIN','ACTIVE','subject_expert')`, [subjectExpertId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [subjectExpertId, created.subjectExpertSessionHash]);
  await db.query(`INSERT INTO admin_subject_scope(user_id,subject_id) VALUES ($1,$2)`, [subjectExpertId, created.subjectExpertSubjectId]);

  const studentId = crypto.randomUUID();
  const studentToken = crypto.randomBytes(32).toString('hex');
  created.studentId = studentId;
  created.studentSessionHash = tokenHash(studentToken);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,$2)`, [studentId, 'Adaptive Plan E2E Student']);
  await db.query(`INSERT INTO learner_profile(learner_id,language) VALUES ($1,'en')`, [studentId]);
  await db.query(`INSERT INTO app_user(id,role,status) VALUES ($1,'STUDENT','ACTIVE')`, [studentId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [studentId, created.studentSessionHash]);

  const comparisonStudentId = crypto.randomUUID();
  const comparisonStudentToken = crypto.randomBytes(32).toString('hex');
  created.comparisonStudentId = comparisonStudentId;
  created.comparisonStudentSessionHash = tokenHash(comparisonStudentToken);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,$2)`, [comparisonStudentId, 'Adaptive Plan Comparison Student']);
  await db.query(`INSERT INTO learner_profile(learner_id,language) VALUES ($1,'en')`, [comparisonStudentId]);
  await db.query(`INSERT INTO app_user(id,role,status) VALUES ($1,'STUDENT','ACTIVE')`, [comparisonStudentId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [comparisonStudentId, created.comparisonStudentSessionHash]);

  const adaptiveEdge = await db.query(`
    WITH foundation AS (SELECT id FROM topic WHERE chapter_id='apt.foundation'),
    candidates AS (
      SELECT id FROM foundation
      UNION
      SELECT DISTINCT tp.topic_id FROM topic_prerequisite tp WHERE tp.prerequisite_topic_id IN (SELECT id FROM foundation)
    )
    SELECT tp.topic_id, tp.prerequisite_topic_id
      FROM topic_prerequisite tp JOIN candidates c ON c.id=tp.topic_id
     ORDER BY tp.topic_id LIMIT 1
  `);
  assert.ok(adaptiveEdge.rows.length, 'an adaptive candidate topic with a prerequisite is required');
  created.adaptiveDependentTopicId = adaptiveEdge.rows[0].topic_id;
  created.adaptivePrerequisiteTopicId = adaptiveEdge.rows[0].prerequisite_topic_id;
  await db.query(`
    INSERT INTO learner_topic_state(learner_id,topic_id,accuracy_score,attempt_count,correct_count)
    VALUES ($1,$2,0.1,5,1)
  `, [studentId, created.adaptivePrerequisiteTopicId]);
  await db.query(`
    INSERT INTO learner_topic_state(learner_id,topic_id,accuracy_score,attempt_count,correct_count)
    VALUES ($1,$2,0.95,5,5)
  `, [comparisonStudentId, created.adaptivePrerequisiteTopicId]);

  const workflowTopic = await db.query(
    `SELECT t.id FROM topic t LEFT JOIN lesson l ON l.topic_id=t.id
      WHERE l.topic_id IS NULL AND t.id<>$1 ORDER BY t.id LIMIT 1`,
    [topicId]
  );
  assert.ok(workflowTopic.rows.length, 'a second lesson-free topic is required for lesson workflow tests');
  created.lessonWorkflowTopicId = workflowTopic.rows[0].id;

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'test' } });
  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk.toString(); });
  server.stderr.on('data', (chunk) => { output += chunk.toString(); });
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { const response = await fetch(`${baseUrl}/api/admin/content/review`); if (response.status !== 404) { ready = true; break; } } catch {}
    await sleep(1000);
  }
  if (!ready) throw new Error(`Next server did not become ready. Output: ${output}`);

  const cookie = `session_token=${token}`;
  const questionReviewerCookie = `session_token=${questionReviewerToken}`;
  const contentReviewerCookie = `session_token=${contentReviewerToken}`;
  const subjectExpertCookie = `session_token=${subjectExpertToken}`;
  const studentCookie = `session_token=${studentToken}`;
  const comparisonStudentCookie = `session_token=${comparisonStudentToken}`;

  // Learner-only adaptive endpoints must bind all data to the authenticated student, never a global seed learner.
  const anonymousAdaptivePlan = await fetch(`${baseUrl}/api/learning/adaptive-plan`);
  assert.equal(anonymousAdaptivePlan.status, 401);
  const adminAdaptivePlan = await fetch(`${baseUrl}/api/learning/adaptive-plan`, { headers: { cookie } });
  assert.equal(adminAdaptivePlan.status, 401);
  const studentAdaptivePlan = await fetch(`${baseUrl}/api/learning/adaptive-plan`, { headers: { cookie: studentCookie } });
  assert.equal(studentAdaptivePlan.status, 200);
  const studentAdaptivePlanBody = await studentAdaptivePlan.json();
  assert.equal(studentAdaptivePlanBody.learnerId, studentId);
  assert.ok(studentAdaptivePlanBody.steps.length > 0);
  assert.ok(studentAdaptivePlanBody.steps.every((step) => step.topicName && step.subjectName && step.estimatedMinutes > 0));
  assert.ok(studentAdaptivePlanBody.topicInsights.length > 0);
  assert.ok(studentAdaptivePlanBody.topicInsights.every((topic) => topic.topicName && topic.classification && typeof topic.accuracy === 'number'));
  assert.ok(studentAdaptivePlanBody.steps.some((step) => step.type === 'PREREQUISITE_LESSON' && step.topicId === created.adaptivePrerequisiteTopicId),
    'a weak prerequisite should be inserted into the first learner’s roadmap before the dependent topic');
  const comparisonAdaptivePlan = await fetch(`${baseUrl}/api/learning/adaptive-plan`, { headers: { cookie: comparisonStudentCookie } });
  assert.equal(comparisonAdaptivePlan.status, 200);
  const comparisonAdaptivePlanBody = await comparisonAdaptivePlan.json();
  assert.equal(comparisonAdaptivePlanBody.learnerId, comparisonStudentId);
  assert.equal(comparisonAdaptivePlanBody.steps.some((step) => step.type === 'PREREQUISITE_LESSON' && step.topicId === created.adaptivePrerequisiteTopicId), false,
    'the second learner’s stronger prerequisite must not inherit the first learner’s weakness');
  const learnerScopedReads = [
    ['/api/v1/learning/plan', 'legacy weekly plan'],
    ['/api/v1/learning/next-action', 'legacy adaptive next action'],
    ['/api/v1/recommendations', 'legacy recommendation list'],
    ['/api/learning/recommendations', 'recommendation list'],
    ['/api/learner/summary', 'learner digital-twin summary'],
    ['/api/interventions', 'intervention history'],
    ['/api/v1/interventions', 'legacy intervention history'],
    ['/api/v1/interventions/effectiveness', 'intervention effectiveness'],
    ['/api/v1/interventions/effectiveness/by-topic', 'topic intervention effectiveness'],
    ['/api/assessments/default/eligibility', 'default assessment eligibility'],
    ['/api/milestones', 'milestone history'],
    ['/api/pyq/performance', 'PYQ performance'],
    ['/api/v1/analytics', 'legacy learner analytics'],
    ['/api/v1/exam-readiness', 'exam readiness'],
    ['/api/v1/pyq', 'legacy PYQ catalogue'],
    ['/api/v1/ai/context/' + encodeURIComponent(created.adaptiveDependentTopicId), 'personalized AI learner context'],
  ];
  for (const [path, label] of learnerScopedReads) {
    const denied = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
    assert.equal(denied.status, 401, `${label} must reject admin sessions: `);
    const allowed = await fetch(`${baseUrl}${path}`, { headers: { cookie: studentCookie } });
    assert.equal(allowed.status, 200, `${label} should work for a student: `);
  }
  const adminInterventionStart = await fetch(`${baseUrl}/api/learning/interventions/start`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ topicId: created.adaptiveDependentTopicId, action: 'PRACTICE' }),
  });
  assert.equal(adminInterventionStart.status, 401);
  const adminProtectedPosts = [
    '/api/assessments/default',
    '/api/assessments/00000000-0000-0000-0000-000000000000/submit',
    '/api/games',
    '/api/games/00000000-0000-0000-0000-000000000000/submit',
    '/api/milestones/evaluate',
    '/api/sessions',
    '/api/v1/ai/tutor',
    '/api/v1/pyq/00000000-0000-0000-0000-000000000000/attempt',
    '/api/v1/tests',
    '/api/v1/tests/00000000-0000-0000-0000-000000000000/submit',
  ];
  for (const path of adminProtectedPosts) {
    const denied = await fetch(`${baseUrl}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}',
    });
    assert.equal(denied.status, 401, `admin session must be rejected by ${path}: `);
  }
  const studentInterventionStart = await fetch(`${baseUrl}/api/learning/interventions/start`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: studentCookie },
    body: JSON.stringify({ topicId: created.adaptiveDependentTopicId, action: 'PRACTICE' }),
  });
  assert.equal(studentInterventionStart.status, 200);
  console.log('adaptive plan authentication, mistake-based prerequisite remediation, learner isolation and legacy adaptive API auth E2E: PASS');

  // Subject experts see and mutate only their explicitly assigned syllabus subjects.
  const scopedTopicsResponse = await fetch(`${baseUrl}/api/admin/topics`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(scopedTopicsResponse.status, 200);
  const scopedTopics = await scopedTopicsResponse.json();
  assert.ok(scopedTopics.topics.length > 0);
  assert.ok(scopedTopics.topics.every((topic) => topic.subjectId === created.subjectExpertSubjectId));

  const blockedUnscopedQuestionBrowse = await fetch(`${baseUrl}/api/admin/questions`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(blockedUnscopedQuestionBrowse.status, 400);
  const allowedQuestionRead = await fetch(`${baseUrl}/api/admin/questions?topic=${encodeURIComponent(topicId)}`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(allowedQuestionRead.status, 200);
  const blockedQuestionRead = await fetch(`${baseUrl}/api/admin/questions?topic=${encodeURIComponent(otherTopicId)}`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(blockedQuestionRead.status, 403);

  const scopedLessonsResponse = await fetch(`${baseUrl}/api/admin/lessons`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(scopedLessonsResponse.status, 200);
  const scopedLessons = await scopedLessonsResponse.json();
  assert.ok(scopedLessons.topics.every((topic) => topic.subjectId === created.subjectExpertSubjectId));

  const scopedTopicMapResponse = await fetch(`${baseUrl}/api/admin/content-engine/topic-map`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(scopedTopicMapResponse.status, 200);
  const scopedTopicMap = await scopedTopicMapResponse.json();
  assert.ok(scopedTopicMap.topics.length > 0);
  assert.ok(scopedTopicMap.topics.every((topic) => topic.subject_id === created.subjectExpertSubjectId));

  const blockedGenerationTopics = await fetch(`${baseUrl}/api/admin/content-engine/generate`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(blockedGenerationTopics.status, 403);
  const blockedGeneration = await fetch(`${baseUrl}/api/admin/content-engine/generate`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: subjectExpertCookie },
    body: JSON.stringify({ topicId, mcqCount: 3 }),
  });
  assert.equal(blockedGeneration.status, 403);
  const blockedPublications = await fetch(`${baseUrl}/api/admin/content-engine/publications`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(blockedPublications.status, 403);
  const blockedReviewQueue = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie: subjectExpertCookie } });
  assert.equal(blockedReviewQueue.status, 403);
  console.log('subject expert subject-scope and AI-generation boundary E2E: PASS');

  // Admin Question Bank: syllabus topics, draft creation, review and publish RBAC.
  const topicListResponse = await fetch(`${baseUrl}/api/admin/topics`, { headers: { cookie } });
  assert.equal(topicListResponse.status, 200);
  const topicList = await topicListResponse.json();
  assert.ok(topicList.topics.some((topic) => topic.topicId === topicId));

  const manualQuestionResponse = await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      topicId,
      prompt: `CI manual question ${crypto.randomUUID()}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answerIndex: 1,
      explanation: 'Option B is supported by the reviewed study material.',
      difficulty: 0.4,
      estimatedSeconds: 35,
    }),
  });
  const manualQuestionText = await manualQuestionResponse.text();
  assert.equal(manualQuestionResponse.status, 201, manualQuestionText);
  const manualQuestion = JSON.parse(manualQuestionText);
  created.manualQuestionIds.push(manualQuestion.id);
  assert.equal(manualQuestion.status, 'DRAFT');
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [manualQuestion.id])).rows[0].status, 'DRAFT');

  const questionListResponse = await fetch(`${baseUrl}/api/admin/questions?topic=${encodeURIComponent(topicId)}`, { headers: { cookie } });
  assert.equal(questionListResponse.status, 200);
  assert.ok((await questionListResponse.json()).questions.some((question) => question.id === manualQuestion.id));

  const submitQuestionResponse = await fetch(`${baseUrl}/api/admin/questions/${manualQuestion.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ status: 'IN_REVIEW' }),
  });
  assert.equal(submitQuestionResponse.status, 200);

  const reviewQuestionResponse = await fetch(`${baseUrl}/api/admin/questions/${manualQuestion.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: questionReviewerCookie },
    body: JSON.stringify({ status: 'REVIEWED' }),
  });
  assert.equal(reviewQuestionResponse.status, 200);

  const blockedQuestionPublish = await fetch(`${baseUrl}/api/admin/questions/${manualQuestion.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: questionReviewerCookie },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  assert.equal(blockedQuestionPublish.status, 403);

  const reviewerEditWithoutTransition = await fetch(`${baseUrl}/api/admin/questions/${manualQuestion.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: questionReviewerCookie },
    body: JSON.stringify({ explanation: 'Reviewer correction while retaining REVIEWED status.', status: 'REVIEWED' }),
  });
  assert.equal(reviewerEditWithoutTransition.status, 200);

  const publishQuestionResponse = await fetch(`${baseUrl}/api/admin/questions/${manualQuestion.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  assert.equal(publishQuestionResponse.status, 200);
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [manualQuestion.id])).rows[0].status, 'PUBLISHED');

  // Lesson workflow: reviewers approve, publishers publish; no skipped approval.
  const lessonWorkflowTopicId = created.lessonWorkflowTopicId;
  const lessonDraftResponse = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PUT', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      title: 'CI lesson workflow',
      concept: 'A controlled lesson publication lifecycle.',
      definition: 'A lesson must be reviewed before publication.',
      explanation: 'Author, reviewer and publisher are separate workflow steps.',
      examples: [], revisionNotes: ['Review before publish.'],
      contentMarkdown: '## Workflow\n\nReview before publication.',
      status: 'DRAFT',
    }),
  });
  assert.equal(lessonDraftResponse.status, 200);

  const skippedApprovalResponse = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: contentReviewerCookie },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  assert.equal(skippedApprovalResponse.status, 409);

  const submitLessonResponse = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ status: 'IN_REVIEW' }),
  });
  assert.equal(submitLessonResponse.status, 200);

  const approveLessonResponse = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: contentReviewerCookie },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  assert.equal(approveLessonResponse.status, 200);

  const blockedLessonPublish = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie: contentReviewerCookie },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  assert.equal(blockedLessonPublish.status, 403);

  const publishLessonResponse = await fetch(`${baseUrl}/api/admin/lessons/${encodeURIComponent(lessonWorkflowTopicId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  assert.equal(publishLessonResponse.status, 200);
  assert.equal((await db.query(`SELECT status FROM lesson WHERE topic_id=$1`, [lessonWorkflowTopicId])).rows[0].status, 'PUBLISHED');

  console.log('admin question bank + lesson review/publish RBAC E2E: PASS');

  async function importPublication(label, title = `Review ${label}`) {
    const lessonId = `ci-review-lesson-${label}-${crypto.randomUUID()}`;
    const questionId = `ci-review-mcq-${label}-${crypto.randomUUID()}`;
    const publicationId = `ci-review-${label}-${crypto.randomUUID()}`;
    const evidenceResourceId = crypto.randomUUID();
    created.reviewEvidenceResourceIds.push(evidenceResourceId);
    await db.query(
      `INSERT INTO topic_resource(id,topic_id,title,body,source,status) VALUES($1,$2,$3,$4,$5,'PUBLISHED')`,
      [evidenceResourceId, topicId, `CI evidence ${label}`, `The CI review source supports this answer for ${label}. This approved study excerpt is used to verify source evidence rendering in the review queue.`, `ci-review-${label}.txt`]
    );
    await db.query(
      `INSERT INTO content_lineage(resource_id,source_file_name,source_page,topic_id) VALUES($1,$2,1,$3)`,
      [evidenceResourceId, `ci-review-${label}.txt`, topicId]
    );
    const items = [
      { kind: 'lesson', content_id: lessonId, topic_id: topicId, payload: { title, concept: `Review concept ${label}`, definition: `Review definition ${label}`, explanation: `Review explanation ${label}`, examples: [`Example ${label}`], revisionNotes: [`Note ${label}`], sourceIds: [evidenceResourceId], version: 1 } },
      { kind: 'mcq', content_id: questionId, topic_id: topicId, payload: { question: `Which option is correct for ${label}?`, options: ['A','B','C','D'], answerIndex: 0, explanation: 'A is correct.', difficulty: 'easy', sourceIds: [evidenceResourceId], answerEvidence: { sourceId: evidenceResourceId, quote: `The CI review source supports this answer for ${label}.` } } },
    ];
    const response = await fetch(`${baseUrl}/api/admin/content-engine/import`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ publicationId, manifestHash: manifestHash(publicationId, items), items }) });
    const responseText = await response.text();
    assert.equal(response.status, 201, responseText);
    const body = JSON.parse(responseText);
    assert.equal(body.reviewBatchIds.length, 1);
    created.publications.push(publicationId); created.batches.push(body.reviewBatchIds[0]); created.questionIds.push(questionId); created.lessonIds.push(lessonId);
    const importedLineage = await db.query(`SELECT content_id,content_kind,status,publication_id,source_ids FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [publicationId]);
    assert.equal(importedLineage.rows.length, 2);
    assert.deepEqual(importedLineage.rows.map((x) => x.status), ['IMPORTED', 'IMPORTED']);
    assert.ok(importedLineage.rows.every((x) => x.source_ids.includes(evidenceResourceId)));
    assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [questionId])).rows[0].status, 'DRAFT');
    assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [lessonId])).rows[0].status, 'PENDING');
    return { publicationId, batchId: body.reviewBatchIds[0], questionId, lessonId, evidenceResourceId };
  }

  const approve = await importPublication('approve', 'Version One');
  const pendingEvidenceResponse = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie } });
  assert.equal(pendingEvidenceResponse.status, 200);
  const pendingEvidenceBody = await pendingEvidenceResponse.json();
  const pendingEvidenceBatch = pendingEvidenceBody.batches.find((batch) => batch.id === approve.batchId);
  assert.ok(pendingEvidenceBatch, 'new AI-style review batch should be visible');
  assert.equal(pendingEvidenceBatch.questions[0].sourceEvidence[0].id, approve.evidenceResourceId);
  assert.match(pendingEvidenceBatch.questions[0].sourceEvidence[0].body, /supports this answer/);
  assert.equal(pendingEvidenceBatch.lessons[0].sourceEvidence[0].id, approve.evidenceResourceId);

  const questionReviewerQueueResponse = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie: questionReviewerCookie } });
  assert.equal(questionReviewerQueueResponse.status, 200);
  const questionReviewerQueue = await questionReviewerQueueResponse.json();
  assert.equal(questionReviewerQueue.batches.some((batch) => batch.id === approve.batchId), false);

  const contentReviewerQueueResponse = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie: contentReviewerCookie } });
  assert.equal(contentReviewerQueueResponse.status, 200);
  const contentReviewerQueue = await contentReviewerQueueResponse.json();
  assert.equal(contentReviewerQueue.batches.some((batch) => batch.id === approve.batchId), false);
  console.log('review queue filters batches by question/content review permission: PASS');
  console.log('question and lesson source evidence is available to human reviewers: PASS');
  const unverifiedResponse = await fetch(`${baseUrl}/api/admin/content/review/${approve.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(unverifiedResponse.status, 400);
  assert.equal((await db.query(`SELECT status FROM content_review_batch WHERE id=$1`, [approve.batchId])).rows[0].status, 'PENDING');
  const approveResponse = await fetch(`${baseUrl}/api/admin/content/review/${approve.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'approve', humanVerified: true }) });
  assert.equal(approveResponse.status, 200);
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [approve.questionId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [approve.lessonId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT COUNT(*)::int AS count FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].count, 1);
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  assert.equal((await db.query(`SELECT version_number FROM content_engine_lesson_version WHERE topic_id=$1 AND status='PUBLISHED'`, [topicId])).rows[0].version_number, 1);
  const approvedLineage = await db.query(`SELECT content_kind,status,platform_id,source_ids,published_at,version_number FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [approve.publicationId]);
  assert.equal(approvedLineage.rows.length, 2);
  assert.ok(approvedLineage.rows.every((x) => x.status === 'PUBLISHED'));
  assert.ok(approvedLineage.rows.every((x) => x.platform_id));
  assert.equal(approvedLineage.rows.find((x) => x.content_kind === 'lesson').version_number, 1);
  assert.equal((await db.query(`SELECT status FROM content_engine_publication WHERE publication_id=$1`, [approve.publicationId])).rows[0].status, 'APPROVED');

  const learnerLessonResponse = await fetch(`${baseUrl}/api/lesson/${encodeURIComponent(topicId)}`, { headers: { cookie } });
  const learnerLessonText = await learnerLessonResponse.text();
  assert.equal(learnerLessonResponse.status, 200, learnerLessonText);
  const learnerLesson = JSON.parse(learnerLessonText);
  assert.equal(learnerLesson.topic, topicId);
  assert.equal(learnerLesson.title, 'Version One');

  const v2 = await importPublication('v2', 'Version Two');
  const v2Response = await fetch(`${baseUrl}/api/admin/content/review/${v2.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'approve', humanVerified: true }) });
  assert.equal(v2Response.status, 200);
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version Two');
  const versions = await db.query(`SELECT version_number,title,status FROM content_engine_lesson_version WHERE topic_id=$1 ORDER BY version_number`, [topicId]);
  assert.deepEqual(versions.rows.map((x) => [x.version_number,x.title,x.status]), [[1,'Version One','SUPERSEDED'],[2,'Version Two','PUBLISHED']]);

  const rollbackResponse = await fetch(`${baseUrl}/api/admin/content-engine/rollback`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ topicId, versionNumber: 1 }) });
  assert.equal(rollbackResponse.status, 200);
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  const afterRollback = await db.query(`SELECT version_number,title,status FROM content_engine_lesson_version WHERE topic_id=$1 ORDER BY version_number`, [topicId]);
  assert.equal(afterRollback.rows.find((x) => x.version_number === 1).status, 'PUBLISHED');
  assert.equal(afterRollback.rows.find((x) => x.version_number === 2).status, 'SUPERSEDED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lineage WHERE publication_id=$1 AND content_id=$2`, [approve.publicationId, approve.lessonId])).rows[0].status, 'PUBLISHED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lineage WHERE publication_id=$1 AND content_id=$2`, [v2.publicationId, v2.lessonId])).rows[0].status, 'REJECTED');

  const reject = await importPublication('reject', 'Rejected Version');
  const rejectResponse = await fetch(`${baseUrl}/api/admin/content/review/${reject.batchId}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ decision: 'reject' }) });
  assert.equal(rejectResponse.status, 200);
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`, [topicId])).rows[0].title, 'Version One');
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`, [reject.questionId])).rows[0].status, 'ARCHIVED');
  assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`, [reject.lessonId])).rows[0].status, 'REJECTED');
  assert.equal((await db.query(`SELECT status FROM content_review_batch WHERE id=$1`, [reject.batchId])).rows[0].status, 'REJECTED');
  const rejectedLineage = await db.query(`SELECT status,platform_id FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`, [reject.publicationId]);
  assert.equal(rejectedLineage.rows.length, 2);
  assert.ok(rejectedLineage.rows.every((x) => x.status === 'REJECTED'));
  assert.ok(rejectedLineage.rows.every((x) => x.platform_id === null));
  assert.equal((await db.query(`SELECT status FROM content_engine_publication WHERE publication_id=$1`, [reject.publicationId])).rows[0].status, 'REJECTED');

  const pending = await fetch(`${baseUrl}/api/admin/content/review`, { headers: { cookie } });
  assert.equal(pending.status, 200);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.batches.some((batch) => batch.id === approve.batchId || batch.id === reject.batchId || batch.id === v2.batchId), false);
  console.log('content-engine admin review + lineage + version rollback E2E: PASS');
} finally {
  try {
    for (const id of created.batches) await db.query('DELETE FROM content_review_batch WHERE id=$1', [id]);
    for (const id of created.lessonIds) await db.query('DELETE FROM content_engine_lesson_staging WHERE id=$1', [id]);
    for (const id of created.questionIds) await db.query('DELETE FROM question WHERE id=$1', [id]);
    for (const id of created.manualQuestionIds) await db.query('DELETE FROM question WHERE id=$1', [id]);
    if (created.lessonWorkflowTopicId) await db.query('DELETE FROM lesson WHERE topic_id=$1', [created.lessonWorkflowTopicId]);
    for (const id of created.publications) await db.query('DELETE FROM content_engine_publication WHERE publication_id=$1', [id]);
    for (const id of created.reviewEvidenceResourceIds) await db.query('DELETE FROM topic_resource WHERE id=$1', [id]);
    for (const hash of [created.sessionHash, created.questionReviewerSessionHash, created.contentReviewerSessionHash, created.subjectExpertSessionHash, created.studentSessionHash, created.comparisonStudentSessionHash].filter(Boolean)) {
      await db.query('DELETE FROM user_session WHERE token_hash=$1', [hash]);
    }
    for (const id of [created.adminId, created.questionReviewerId, created.contentReviewerId, created.subjectExpertId, created.studentId, created.comparisonStudentId].filter(Boolean)) {
      await db.query('DELETE FROM app_user WHERE id=$1', [id]);
      await db.query('DELETE FROM learner WHERE id=$1', [id]);
    }
  } finally {
    if (server) { server.kill('SIGTERM'); await sleep(500); }
    await db.end();
  }
}
