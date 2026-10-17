#!/usr/bin/env node
// One-time port of the hardcoded LESSONS object (src/domain/lessons.mjs)
// into the new `lesson` table, so lesson content becomes admin-editable.
// Safe to re-run: upserts by topic_id, never duplicates.

import { LESSONS } from '../src/domain/lessons.mjs';
import { query } from '../src/lib/db.mjs';

let count = 0;
for (const [topicId, lesson] of Object.entries(LESSONS)) {
  const { rows: topicRows } = await query('SELECT id FROM topic WHERE id = $1', [topicId]);
  if (topicRows.length === 0) {
    console.log(`skip ${topicId} -- no matching topic row`);
    continue;
  }
  await query(
    `INSERT INTO lesson (topic_id, title, concept, example_problem, example_steps, example_answer, tip)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (topic_id) DO UPDATE SET
       title = EXCLUDED.title, concept = EXCLUDED.concept, example_problem = EXCLUDED.example_problem,
       example_steps = EXCLUDED.example_steps, example_answer = EXCLUDED.example_answer, tip = EXCLUDED.tip,
       updated_at = now()`,
    [topicId, lesson.title, lesson.concept, lesson.example.problem, JSON.stringify(lesson.example.steps), lesson.example.answer, lesson.tip]
  );
  count += 1;
}

console.log(`${count} lesson(s) seeded`);
process.exit(0);
