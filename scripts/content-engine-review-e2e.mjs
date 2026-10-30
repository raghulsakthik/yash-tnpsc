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
const canonicalize = (v) => Array.isArray(v) ? v.map(canonicalize) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonicalize(v[k])])) : v;
const manifestHash = (id, items) => crypto.createHash('sha256').update(JSON.stringify(canonicalize({ publication_id: id, items: items.map((x) => ({ kind:x.kind,content_id:x.content_id,topic_id:x.topic_id,payload:x.payload })) }))).digest('hex');
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const db = new Client({ connectionString: databaseUrl });
await db.connect();
let server;
const created = { adminId:null, sessionHash:null, publications:[], batches:[], questions:[], lessons:[] };
try {
  const topic = await db.query(`SELECT t.id FROM topic t LEFT JOIN lesson l ON l.topic_id=t.id ORDER BY (l.topic_id IS NULL) DESC,t.id LIMIT 1`);
  assert.ok(topic.rows.length, 'a topic is required');
  const topicId = topic.rows[0].id;
  const adminId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString('hex');
  created.adminId = adminId; created.sessionHash = tokenHash(token);
  await db.query(`INSERT INTO learner(id,name) VALUES ($1,'Content Engine Review E2E')`, [adminId]);
  await db.query(`INSERT INTO app_user(id,role,status,admin_role) VALUES ($1,'ADMIN','ACTIVE','super_admin')`, [adminId]);
  await db.query(`INSERT INTO user_session(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`, [adminId,created.sessionHash]);
  server = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p',String(port)],{stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'test'}});
  let output=''; server.stdout.on('data',(x)=>{output+=x}); server.stderr.on('data',(x)=>{output+=x});
  let ready=false; for(let i=0;i<60;i++){try{const r=await fetch(`${baseUrl}/api/admin/content/review`);if(r.status!==404){ready=true;break}}catch{} await sleep(1000)}
  if(!ready) throw new Error(`Next server did not become ready. Output: ${output}`);
  const cookie=`session_token=${token}`;
  async function importPublication(label,title){
    const lessonId=`ci-review-lesson-${label}-${crypto.randomUUID()}`, questionId=`ci-review-mcq-${label}-${crypto.randomUUID()}`, publicationId=`ci-review-${label}-${crypto.randomUUID()}`;
    const items=[
      {kind:'lesson',content_id:lessonId,topic_id:topicId,payload:{title,concept:`Review concept ${label}`,definition:`Review definition ${label}`,explanation:`Review explanation ${label}`,examples:[`Example ${label}`],revisionNotes:[`Note ${label}`],sourceIds:['review-evidence-1'],version:1}},
      {kind:'mcq',content_id:questionId,topic_id:topicId,payload:{question:`Which option is correct for ${label}?`,options:['A','B','C','D'],answerIndex:0,explanation:'A is correct.',difficulty:'easy',sourceIds:['review-evidence-1']}}
    ];
    const r=await fetch(`${baseUrl}/api/admin/content-engine/import`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({publicationId,manifestHash:manifestHash(publicationId,items),items})});
    const importBodyText=await r.text(); assert.equal(r.status,201,importBodyText); const body=JSON.parse(importBodyText); assert.equal(body.reviewBatchIds.length,1);
    created.publications.push(publicationId);created.batches.push(body.reviewBatchIds[0]);created.questions.push(questionId);created.lessons.push(lessonId);
    const lineage=await db.query(`SELECT content_kind,status,source_ids FROM content_engine_lineage WHERE publication_id=$1 ORDER BY content_kind`,[publicationId]);
    assert.equal(lineage.rows.length,2); assert.deepEqual(lineage.rows.map(x=>x.status),['IMPORTED','IMPORTED']); assert.ok(lineage.rows.every(x=>x.source_ids.includes('review-evidence-1')));
    return {publicationId,batchId:body.reviewBatchIds[0],questionId,lessonId};
  }
  const approve=await importPublication('approve','Version One');
  let r=await fetch(`${baseUrl}/api/admin/content/review/${approve.batchId}`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({decision:'approve'})}); assert.equal(r.status,200,await r.text());
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`,[approve.questionId])).rows[0].status,'PUBLISHED');
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`,[topicId])).rows[0].title,'Version One');
  assert.equal((await db.query(`SELECT version_number FROM content_engine_lesson_version WHERE topic_id=$1 AND status='PUBLISHED'`,[topicId])).rows[0].version_number,1);
  const v2=await importPublication('v2','Version Two');
  r=await fetch(`${baseUrl}/api/admin/content/review/${v2.batchId}`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({decision:'approve'})}); assert.equal(r.status,200,await r.text());
  assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`,[topicId])).rows[0].title,'Version Two');
  const versions=await db.query(`SELECT version_number,title,status FROM content_engine_lesson_version WHERE topic_id=$1 ORDER BY version_number`,[topicId]); assert.deepEqual(versions.rows.map(x=>[x.version_number,x.title,x.status]),[[1,'Version One','SUPERSEDED'],[2,'Version Two','PUBLISHED']]);
  r=await fetch(`${baseUrl}/api/admin/content-engine/rollback`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({topicId,versionNumber:1})}); assert.equal(r.status,200,await r.text()); assert.equal((await db.query(`SELECT title FROM lesson WHERE topic_id=$1`,[topicId])).rows[0].title,'Version One');
  const reject=await importPublication('reject','Rejected Version');
  r=await fetch(`${baseUrl}/api/admin/content/review/${reject.batchId}`,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({decision:'reject'})}); assert.equal(r.status,200,await r.text());
  assert.equal((await db.query(`SELECT status FROM question WHERE id=$1`,[reject.questionId])).rows[0].status,'ARCHIVED'); assert.equal((await db.query(`SELECT status FROM content_engine_lesson_staging WHERE id=$1`,[reject.lessonId])).rows[0].status,'REJECTED');
  const rejected=await db.query(`SELECT status,platform_id FROM content_engine_lineage WHERE publication_id=$1`,[reject.publicationId]); assert.ok(rejected.rows.every(x=>x.status==='REJECTED'&&x.platform_id===null));
  console.log('content-engine admin review + lineage + version rollback E2E: PASS');
} finally {
  try { for(const id of created.batches) await db.query('DELETE FROM content_review_batch WHERE id=$1',[id]); for(const id of created.lessons) await db.query('DELETE FROM content_engine_lesson_staging WHERE id=$1',[id]); for(const id of created.questions) await db.query('DELETE FROM question WHERE id=$1',[id]); for(const id of created.publications) await db.query('DELETE FROM content_engine_publication WHERE publication_id=$1',[id]); if(created.sessionHash) await db.query('DELETE FROM user_session WHERE token_hash=$1',[created.sessionHash]); if(created.adminId) await db.query('DELETE FROM app_user WHERE id=$1',[created.adminId]); if(created.adminId) await db.query('DELETE FROM learner WHERE id=$1',[created.adminId]); } finally { if(server){server.kill('SIGTERM');await sleep(500)} await db.end(); }
}
