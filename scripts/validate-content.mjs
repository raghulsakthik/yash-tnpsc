#!/usr/bin/env node
// Content validator. Runs in CI and fails the build.
//
// It cannot tell you an answer key is wrong — only a human solving the question
// can do that. It catches everything else: the structural mistakes that are
// invisible in a YAML file and obvious to the learner.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SYLLABUS_DIR = path.join(ROOT, 'content', 'syllabus');
const QUESTIONS_DIR = path.join(ROOT, 'content', 'questions');

const errors = [];
const warnings = [];

const fail = (file, message) => errors.push(`${file}: ${message}`);
const warn = (file, message) => warnings.push(`${file}: ${message}`);

/**
 * Lowercase, strip punctuation, collapse whitespace. Catches re-authored
 * duplicates of the same question written with different punctuation.
 */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lighter normalization for comparing options against each other. Punctuation
 * is meaning here: "-4/7" and "4/7" are different answers, and "3/4" and "34"
 * are not the same option. Only case and spacing are ignored.
 */
export function normalizeOption(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

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
    else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) out.push(full);
  }
  return out;
}

// ----------------------------------------------------------- syllabus tree

const knownTopics = new Set();
const chapterStats = [];

for (const file of await walk(SYLLABUS_DIR)) {
  const rel = path.relative(ROOT, file);
  const doc = YAML.parse(await readFile(file, 'utf8'));

  if (!doc?.subjects) {
    fail(rel, 'no subjects block');
    continue;
  }

  let declaredTotal = 0;

  for (const subject of doc.subjects) {
    if (!subject.id) fail(rel, 'a subject has no id');
    for (const chapter of subject.chapters ?? []) {
      if (!chapter.id) fail(rel, `a chapter in ${subject.id} has no id`);
      if (typeof chapter.question_count !== 'number') {
        fail(rel, `${chapter.id} has no question_count — examWeight needs it`);
      }
      // Only one language subject counts toward the paper total.
      if (subject.language !== 'ta') declaredTotal += chapter.question_count ?? 0;

      const topics = chapter.topics ?? [];
      for (const topic of topics) {
        if (!topic.id) fail(rel, `a topic in ${chapter.id} has no id`);
        if (knownTopics.has(topic.id)) fail(rel, `duplicate topic id ${topic.id}`);
        knownTopics.add(topic.id);
      }

      chapterStats.push({
        id: chapter.id,
        questionCount: chapter.question_count ?? 0,
        topicCount: topics.length,
        transcribed: chapter.transcribed === true,
      });

      if (chapter.transcribed === true && topics.length === 0) {
        fail(rel, `${chapter.id} is marked transcribed but has no topics`);
      }
    }
  }

  if (doc.total_questions && declaredTotal !== doc.total_questions) {
    fail(
      rel,
      `chapter counts add to ${declaredTotal} but total_questions says ${doc.total_questions}`
    );
  }

  for (const edge of doc.prerequisites ?? []) {
    if (!knownTopics.has(edge.topic)) fail(rel, `prerequisite edge references unknown topic ${edge.topic}`);
    if (!knownTopics.has(edge.requires)) fail(rel, `prerequisite edge requires unknown topic ${edge.requires}`);
    if (edge.topic === edge.requires) fail(rel, `${edge.topic} is listed as its own prerequisite`);
    if (!(edge.strength > 0 && edge.strength <= 1)) {
      fail(rel, `prerequisite ${edge.topic} <- ${edge.requires} has strength outside 0..1`);
    }
  }
}

// -------------------------------------------------------------- questions

const seenIds = new Set();
const seenHashes = new Map();
let questionCount = 0;

for (const file of await walk(QUESTIONS_DIR)) {
  const rel = path.relative(ROOT, file);
  const doc = YAML.parse(await readFile(file, 'utf8'));

  if (!doc?.topic) {
    fail(rel, 'no topic declared');
    continue;
  }
  if (knownTopics.size > 0 && !knownTopics.has(doc.topic)) {
    fail(rel, `topic ${doc.topic} is not in the syllabus tree`);
  }
  if (!['ta', 'en'].includes(doc.language)) {
    fail(rel, `language must be 'ta' or 'en', got ${JSON.stringify(doc.language)}`);
  }

  for (const q of doc.questions ?? []) {
    questionCount += 1;
    const where = `${rel} ${q.id ?? '(no id)'}`;

    if (!q.id) fail(where, 'no id');
    else if (seenIds.has(q.id)) fail(where, `duplicate question id ${q.id}`);
    else seenIds.add(q.id);

    if (!q.question?.trim()) fail(where, 'no question text');
    if (!q.explanation?.trim()) fail(where, 'no explanation — she learns from this, not the question');

    if (!Array.isArray(q.options)) {
      fail(where, 'options must be a list');
    } else {
      if (q.options.length < 4) fail(where, `only ${q.options.length} options, need at least 4`);
      const unique = new Set(q.options.map((o) => normalizeOption(o)));
      if (unique.size !== q.options.length) fail(where, 'two options are identical');
      if (!Number.isInteger(q.answer)) {
        fail(where, 'answer must be an integer index into options');
      } else if (q.answer < 0 || q.answer >= q.options.length) {
        fail(where, `answer index ${q.answer} is outside options (0..${q.options.length - 1})`);
      }
    }

    if (typeof q.difficulty !== 'number' || q.difficulty < 0 || q.difficulty > 1) {
      fail(where, `difficulty must be a number in 0..1, got ${q.difficulty}`);
    }
    if (q.estimatedSeconds !== undefined && !(q.estimatedSeconds > 0)) {
      fail(where, 'estimatedSeconds must be positive');
    }

    const hash = `${doc.language}:${normalize(q.question)}`;
    if (seenHashes.has(hash)) {
      fail(where, `same question as ${seenHashes.get(hash)} once punctuation is ignored`);
    } else {
      seenHashes.set(hash, q.id);
    }

    if (!q.trap) warn(where, 'no trap explanation — the distractor feedback is what teaches');
  }
}

// ----------------------------------------------------------------- report

const transcribed = chapterStats.filter((c) => c.transcribed);
const pending = chapterStats.filter((c) => !c.transcribed);
const pendingMarks = pending.reduce((sum, c) => sum + c.questionCount, 0);

console.log(`topics in tree:      ${knownTopics.size}`);
console.log(`questions validated: ${questionCount}`);
console.log(
  `syllabus coverage:   ${transcribed.length}/${chapterStats.length} units split into topics` +
    (pendingMarks > 0 ? ` (${pendingMarks} questions' worth still to transcribe)` : '')
);

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  x ${e}`);
  process.exit(1);
}

console.log('\ncontent OK');
