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
const LANGUAGE = process.env.NOVA_LANGUAGE ?? 'en';
const LEARNER_ID = process.env.NOVA_LEARNER_ID ?? '00000000-0000-0000-0000-000000000001';
const LEARNER_NAME = process.env.NOVA_LEARNER_NAME ?? 'Learner';

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

  await client.query('COMMIT');
  console.log(
    `seeded: ${subjects} subjects, ${chapters} chapters, ${topics} topics, ` +
      `${edges} prerequisite edges, ${questions} questions (language: ${LANGUAGE})`
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`seed failed, nothing written: ${err.message}`);
  await client.end();
  process.exit(1);
}

await client.end();
