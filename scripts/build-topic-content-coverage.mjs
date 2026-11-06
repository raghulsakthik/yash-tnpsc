#!/usr/bin/env node
/** Conservative topic coverage inventory. Unknown DB-backed states stay unknown. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { execFileSync } from 'node:child_process';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = async (dir) => {
  let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...await walk(p)); else if (/\.ya?ml$/i.test(e.name)) out.push(p); }
  return out;
};
const questionCounts = new Map();
for (const file of await walk(path.join(ROOT, 'content/questions'))) {
  const doc = YAML.parse(await readFile(file, 'utf8')) ?? {};
  if (!doc.topic) continue;
  const key = `${doc.topic}::${doc.language ?? 'unknown'}`;
  questionCounts.set(key, (questionCounts.get(key) ?? 0) + (doc.questions?.length ?? 0));
}
const rows = [];
for (const file of (await readdir(path.join(ROOT, 'content/syllabus'))).filter(x => /\.ya?ml$/i.test(x)).sort()) {
  const curriculum = YAML.parse(await readFile(path.join(ROOT, 'content/syllabus', file), 'utf8')) ?? {};
  for (const subject of curriculum.subjects ?? []) for (const chapter of subject.chapters ?? []) for (const topic of chapter.topics ?? []) {
    const en = questionCounts.get(`${topic.id}::en`) ?? 0;
    const ta = questionCounts.get(`${topic.id}::ta`) ?? 0;
    const other = [...questionCounts].filter(([k]) => k.startsWith(`${topic.id}::`) && !k.endsWith('::en') && !k.endsWith('::ta')).reduce((s, [,v]) => s + v, 0);
    rows.push({ curriculum_id: curriculum.curriculum_id, exam_stage: curriculum.exam_stage ?? 'PRELIMS', subject_id: subject.id, subject: subject.name, chapter_id: chapter.id, chapter: chapter.name, topic_id: topic.id, topic: topic.name, syllabus_transcribed: chapter.transcribed === true, authored_questions_en: en, authored_questions_ta: ta, authored_questions_other: other, study_notes_status: 'UNKNOWN_DB_OFFLINE', structured_lesson_status: 'UNKNOWN_DB_OFFLINE', retrieval_topic_link_status: 'NOT_VERIFIED', publication_status: 'NOT_VERIFIED' });
  }
}
let retrieval = {};
try {
  const code = `import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); q=lambda s: c.execute(s).fetchone()[0]; print(json.dumps({'resources_total':q('select count(*) from resources'),'resources_completed':q("select count(*) from resources where lower(status)=\'complete\'"),'extracted_questions':q('select count(*) from questions'),'resource_statuses':dict(c.execute('select status,count(*) from resources group by status').fetchall()),'resource_types':dict(c.execute("select coalesce(resource_type,\'unknown\'),count(*) from resources group by resource_type").fetchall())})); c.close()`;
  retrieval = JSON.parse(execFileSync('python3', ['-c', code, path.join(ROOT,'engines/retrieval/data/engine.sqlite3')], { encoding: 'utf8' }));
} catch (e) { retrieval = { unavailable: e.message }; }
const totalQ = rows.reduce((s,r) => s+r.authored_questions_en+r.authored_questions_ta+r.authored_questions_other, 0);
const covered = rows.filter(r => r.authored_questions_en+r.authored_questions_ta+r.authored_questions_other > 0).length;
const summary = { generated_at: '2026-11-06', topics: rows.length, topics_with_authored_questions: covered, authored_questions: totalQ, retrieval_inventory: retrieval, notes: 'Study notes, structured lessons, topic-resource links and publication are UNKNOWN while PostgreSQL is offline. Retrieval inventory is not treated as learner-published content.' };
const csvFields = Object.keys(rows[0] ?? {});
const csvEscape = v => `"${String(v ?? '').replaceAll('"','""')}"`;
const csv = [csvFields.map(csvEscape).join(','), ...rows.map(r => csvFields.map(k => csvEscape(r[k])).join(','))].join('\n')+'\n';
await writeFile(path.join(ROOT,'docs/topic-content-coverage-2026-11-06.csv'), '\ufeff'+csv);
await writeFile(path.join(ROOT,'docs/topic-content-coverage-2026-11-06.json'), JSON.stringify({ summary, limitations: ['PostgreSQL is offline; notes, lessons, topic-resource links and publication are unknown.', 'Retrieval downloads are not assumed to be learner-published topic content.', 'No resource is assigned to a topic based only on title similarity.'], topics: rows }, null, 2)+'\n');
const md = `# Topic-level content coverage matrix — 6 November 2026\n\n## Summary\n- Syllabus topics: **${rows.length}**\n- Topics with authored questions: **${covered}/${rows.length} (${(covered/rows.length*100).toFixed(1)}%)**\n- Authored questions: **${totalQ}**\n- Retrieval inventory (separate from learner publication): \`${JSON.stringify(retrieval)}\`\n- Study notes, structured lessons, topic-resource links and publication: **not verifiable while PostgreSQL is offline**.\n\n## Interpretation\n- Zero authored questions means the topic has no authored question-bank coverage in the YAML source.\n- English and Tamil are counted independently.\n- Syllabus chapter \`transcribed\` means topic nodes exist; it does not prove learner notes or lessons exist.\n- A topic only counts as lesson/note-covered after database-backed learner visibility confirms approved, published content.\n\n## Outputs\n- \`docs/topic-content-coverage-2026-11-06.csv\` — spreadsheet-ready per-topic matrix.\n- \`docs/topic-content-coverage-2026-11-06.json\` — machine-readable matrix and limitations.\n`;
await writeFile(path.join(ROOT,'docs/topic-content-coverage-2026-11-06.md'), md);
console.log(`TOPIC_COVERAGE topics=${rows.length} topics_with_questions=${covered} (${(covered/rows.length*100).toFixed(1)}%) authored_questions=${totalQ}`);
console.log(`RETRIEVAL ${JSON.stringify(retrieval)}`);
