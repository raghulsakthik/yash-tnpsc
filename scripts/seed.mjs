#!/usr/bin/env node
// Seeds the syllabus tree and the question bank from content/ into Postgres.
// Idempotent: run it as often as you like. Content files are the source of
// truth; the database is downstream and disposable.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import YAML from 'yaml';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGE = process.env.APP_LANGUAGE ?? 'en';
const LEARNER_ID = process.env.APP_LEARNER_ID ?? '00000000-0000-0000-0000-000000000001';
const LEARNER_NAME = process.env.APP_LEARNER_NAME ?? 'Learner';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  process.exit(1);
}

const normalize = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.ya?ml$/.test(entry.name)) out.push(full);
  }
  return out;
}

const client = new pg.Client({ connectionString });
await client.connect();
await client.query('BEGIN');

try {
  // ------------------------------------------------------------- the learner
  await client.query(
    `INSERT INTO learner (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
    [LEARNER_ID, LEARNER_NAME]
  );
  await client.query(
    `INSERT INTO learner_profile (learner_id, language) VALUES ($1, $2)
     ON CONFLICT (learner_id) DO UPDATE SET language = EXCLUDED.language, updated_at = now()`,
    [LEARNER_ID, LANGUAGE]
  );
  // Auth migration keeps the original learner's data. The first registration
  // can claim this account by filling its currently-null credentials.
  await client.query(
    `INSERT INTO app_user (id, role, status) VALUES ($1, 'STUDENT', 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [LEARNER_ID]
  );

  // -------------------------------------------------------------- syllabus
  let subjects = 0;
  let chapters = 0;
  let topics = 0;
  let edges = 0;

  for (const file of await walk(path.join(ROOT, 'content', 'syllabus'))) {
    const doc = YAML.parse(await readFile(file, 'utf8'));

    for (const subject of doc.subjects ?? []) {
      // Only the language paper she is actually sitting gets seeded.
      if (subject.language && subject.language !== LANGUAGE) continue;

      await client.query(
        `INSERT INTO subject (id, name, sort_order) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
        [subject.id, subject.name, subject.sort_order ?? 0]
      );
      subjects += 1;

      for (const chapter of subject.chapters ?? []) {
        await client.query(
          `INSERT INTO chapter (id, subject_id, name, sort_order, question_count)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             subject_id = EXCLUDED.subject_id,
             name = EXCLUDED.name,
             sort_order = EXCLUDED.sort_order,
             question_count = EXCLUDED.question_count`,
          [chapter.id, subject.id, chapter.name, chapter.sort_order ?? 0, chapter.question_count ?? 0]
        );
        chapters += 1;

        for (const [index, topic] of (chapter.topics ?? []).entries()) {
          await client.query(
            `INSERT INTO topic (id, chapter_id, name, sort_order) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               chapter_id = EXCLUDED.chapter_id,
               name = EXCLUDED.name,
               sort_order = EXCLUDED.sort_order`,
            [topic.id, chapter.id, topic.name, index]
          );
          topics += 1;
        }
      }
    }

    for (const edge of doc.prerequisites ?? []) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM topic WHERE id = $1 OR id = $2',
        [edge.topic, edge.requires]
      );
      // Skip edges whose endpoints were not seeded (another language's tree).
      if (rowCount < 1) continue;
      await client.query(
        `INSERT INTO topic_prerequisite (topic_id, prerequisite_topic_id, strength)
         VALUES ($1, $2, $3)
         ON CONFLICT (topic_id, prerequisite_topic_id) DO UPDATE SET strength = EXCLUDED.strength`,
        [edge.topic, edge.requires, edge.strength]
      );
      edges += 1;
    }
  }

  // -------------------------------------------------------------- questions
  let questions = 0;

  for (const file of await walk(path.join(ROOT, 'content', 'questions'))) {
    const doc = YAML.parse(await readFile(file, 'utf8'));
    if (doc.language !== LANGUAGE) continue;

    for (const q of doc.questions ?? []) {
      const hash = crypto.createHash('sha256').update(normalize(q.question)).digest('hex');
      await client.query(
        `INSERT INTO question (
           id, topic_id, language, prompt, options, answer_index, explanation, trap,
           difficulty, estimated_seconds, source, source_year, status, normalized_hash
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,'PUBLISHED',$13)
         ON CONFLICT (id) DO UPDATE SET
           prompt = EXCLUDED.prompt,
           options = EXCLUDED.options,
           answer_index = EXCLUDED.answer_index,
           explanation = EXCLUDED.explanation,
           trap = EXCLUDED.trap,
           difficulty = EXCLUDED.difficulty,
           estimated_seconds = EXCLUDED.estimated_seconds,
           normalized_hash = EXCLUDED.normalized_hash,
           updated_at = now()`,
        [
          q.id,
          doc.topic,
          doc.language,
          q.question,
          JSON.stringify(q.options),
          q.answer,
          q.explanation,
          q.trap ?? null,
          q.difficulty,
          q.estimatedSeconds ?? 60,
          q.source ?? doc.source ?? 'authored',
          q.year ?? null,
          hash,
        ]
      );
      questions += 1;
    }
  }

  // Phase 22/25's real game_definition rows (db/migrations is schema-only;
  // these depend on the real topic/chapter rows seeded above, which
  // `npm run setup`'s migrate -> seed order means don't exist yet at
  // migration time -- moved here rather than left to insert a NULL
  // target_topic_ids into a NOT NULL column against a fresh database).
  const gameDefinitions = [
    {
      id: 'speed-round-aptitude',
      name: 'Aptitude Speed Round',
      chapterId: 'apt.aptitude',
      difficultyFloor: 0.1,
      difficultyCeiling: 0.6,
      questionCount: 10,
      timeLimitSeconds: 90,
    },
    {
      id: 'speed-round-reasoning',
      name: 'Reasoning Speed Round',
      chapterId: 'apt.reasoning',
      difficultyFloor: 0,
      difficultyCeiling: 0.5,
      questionCount: 8,
      timeLimitSeconds: 75,
    },
    {
      id: 'constitution-match-polity',
      name: 'Constitution Match',
      chapterId: 'gs.indian-polity',
      difficultyFloor: 0,
      difficultyCeiling: 0.5,
      questionCount: 10,
      timeLimitSeconds: 120,
    },
  ];
  const scoringConfig = JSON.stringify({ pointsPerCorrect: 10, speedBonusMax: 5, streakBonusPerStreak: 2, streakBonusCap: 10 });
  let games = 0;
  for (const g of gameDefinitions) {
    const { rows: topicRows } = await client.query('SELECT array_agg(id) AS ids FROM topic WHERE chapter_id = $1', [g.chapterId]);
    const targetTopicIds = topicRows[0]?.ids;
    if (!targetTopicIds || targetTopicIds.length === 0) continue; // chapter not seeded (yet) -- never insert a fabricated target list
    await client.query(
      `INSERT INTO game_definition (id, name, target_topic_ids, difficulty_floor, difficulty_ceiling, question_count, time_limit_seconds, scoring_config, mechanics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'SPEED_ROUND')
       ON CONFLICT (id) DO UPDATE SET
         target_topic_ids = EXCLUDED.target_topic_ids,
         difficulty_floor = EXCLUDED.difficulty_floor,
         difficulty_ceiling = EXCLUDED.difficulty_ceiling,
         question_count = EXCLUDED.question_count,
         time_limit_seconds = EXCLUDED.time_limit_seconds,
         scoring_config = EXCLUDED.scoring_config`,
      [g.id, g.name, targetTopicIds, g.difficultyFloor, g.difficultyCeiling, g.questionCount, g.timeLimitSeconds, scoringConfig]
    );
    games += 1;
  }

  // V35's real learning_week/learning_day/learning_unit rows (db/migrations
  // is schema-only; the orientation+foundation week-1 units reference the
  // real topic 'aptitude.whole-numbers' seeded above, which doesn't exist
  // yet at migration time against a fresh database).
  await client.query(
    `INSERT INTO learning_week (id, phase_id, week_number, title, objective)
     VALUES
      ('tnpsc2.phase.orientation.week-1','tnpsc2.phase.orientation',1,'Orientation & Exam Readiness','Understand the exam journey, curriculum structure, weekly rhythm and how diagnostics, practice, PYQs and tests drive the adaptive path.'),
      ('tnpsc2.phase.foundation.week-1','tnpsc2.phase.foundation',1,'Arithmetic Foundation','Build the first arithmetic foundations through concepts, guided practice, application, exam practice, PYQs, speed revision and a weekly test.')
     ON CONFLICT (phase_id, week_number) DO NOTHING`
  );
  await client.query(
    `INSERT INTO learning_day (id, week_id, day_number, title, purpose, target_minutes)
     SELECT w.id||'.day-'||d.day_number, w.id, d.day_number, d.title, d.purpose, d.target_minutes
     FROM learning_week w
     CROSS JOIN (VALUES
      (1,'Learn concepts','Build understanding of the week''s core concepts.',25),
      (2,'Guided practice','Apply concepts with guided examples and supported practice.',25),
      (3,'Application','Use the concepts in progressively independent problems.',25),
      (4,'Exam-level practice','Work with exam-oriented questions and timing.',25),
      (5,'PYQs','Practice relevant previous-year questions.',25),
      (6,'Speed + revision','Revise weak areas and improve response speed.',25),
      (7,'Weekly test','Measure the week''s learning and identify remediation.',30)
     ) AS d(day_number,title,purpose,target_minutes)
     WHERE w.id IN ('tnpsc2.phase.orientation.week-1','tnpsc2.phase.foundation.week-1')
     ON CONFLICT (week_id, day_number) DO NOTHING`
  );
  const { rows: wholeNumbersTopicRows } = await client.query(`SELECT id FROM topic WHERE id = 'aptitude.whole-numbers'`);
  if (wholeNumbersTopicRows.length > 0) {
    await client.query(
      `INSERT INTO learning_unit (id,day_id,topic_id,title,unit_type,sort_order,estimated_minutes,required)
       VALUES
        ('tnpsc2.phase.orientation.week-1.day-1.unit-1','tnpsc2.phase.orientation.week-1.day-1',NULL,'Exam journey and adaptive learning model','CONCEPT',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-2.unit-1','tnpsc2.phase.orientation.week-1.day-2',NULL,'How weekly learning, practice, PYQs and tests connect','GUIDED_PRACTICE',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-3.unit-1','tnpsc2.phase.orientation.week-1.day-3',NULL,'Build a personal study rhythm','APPLICATION',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-4.unit-1','tnpsc2.phase.orientation.week-1.day-4',NULL,'Exam-level time awareness','EXAM_PRACTICE',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-5.unit-1','tnpsc2.phase.orientation.week-1.day-5',NULL,'Introduction to PYQ practice','PYQ',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-6.unit-1','tnpsc2.phase.orientation.week-1.day-6',NULL,'Revision and speed routine','SPEED',1,25,true),
        ('tnpsc2.phase.orientation.week-1.day-7.unit-1','tnpsc2.phase.orientation.week-1.day-7',NULL,'Orientation checkpoint','TEST',1,30,true),
        ('tnpsc2.phase.foundation.week-1.day-1.unit-1','tnpsc2.phase.foundation.week-1.day-1','aptitude.whole-numbers','Whole numbers and place value','CONCEPT',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-2.unit-1','tnpsc2.phase.foundation.week-1.day-2','aptitude.whole-numbers','Whole numbers guided practice','GUIDED_PRACTICE',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-3.unit-1','tnpsc2.phase.foundation.week-1.day-3','aptitude.whole-numbers','Whole numbers application','APPLICATION',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-4.unit-1','tnpsc2.phase.foundation.week-1.day-4','aptitude.whole-numbers','Whole numbers exam practice','EXAM_PRACTICE',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-5.unit-1','tnpsc2.phase.foundation.week-1.day-5','aptitude.whole-numbers','Whole numbers PYQs','PYQ',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-6.unit-1','tnpsc2.phase.foundation.week-1.day-6','aptitude.whole-numbers','Whole numbers speed revision','SPEED',1,25,true),
        ('tnpsc2.phase.foundation.week-1.day-7.unit-1','tnpsc2.phase.foundation.week-1.day-7','aptitude.whole-numbers','Foundation Week 1 test','TEST',1,30,true)
       ON CONFLICT (id) DO NOTHING`
    );
  }

  await client.query('COMMIT');
  console.log(
    `seeded: ${subjects} subjects, ${chapters} chapters, ${topics} topics, ` +
      `${edges} prerequisite edges, ${questions} questions, ${games} game definitions (language: ${LANGUAGE})`
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`seed failed, nothing written: ${err.message}`);
  await client.end();
  process.exit(1);
}

await client.end();
