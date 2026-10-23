# Content

Phase 1 audit. Scope: syllabus storage, question storage, content pipeline. Verified live via `npm run validate:content` and `npm run db:seed` (both passed cleanly — see `existing-functionality.md`).

## Syllabus storage (`content/syllabus/prelims-495.yaml`)

Single version-controlled YAML file is the authority for the entire topic tree + exam weights — never typed directly into the database. Top-level: `exam: tnpsc-prelims-495`, `code: 495`, `dated: 2024-12-12`, `total_questions: 200`, `subjects: []`, `prerequisites: []`.

- **Subject**: `id`, `name`, `sort_order`, optional `language`, `chapters: []`.
- **Chapter**: `id`, `name`, `sort_order`, `question_count` (the official paper's real count — sole input to exam-weight; comment: "never invent a weight"), `transcribed` (bool), `topics: []`.
- **Topic**: `{id, name}` — flat.
- **Prerequisite edge**: `{topic, requires, strength}`, `strength ∈ (0,1]`.

Four subjects: `general-studies` (75 Q, 6 chapters, only `gs.indian-polity` transcribed with 19 topics), `aptitude-mental-ability` (25 Q, 3 chapters, all transcribed), `language-en` (100 Q, 7 chapters, all untranscribed), `language-ta` (same 100 Q split, untranscribed, excluded from the `total_questions` sum check as the alternate-language track). Sum check: 75+25+100 = 200.

15 prerequisite edges, all within the aptitude chain (e.g. `division ← whole-numbers (0.80)`, `percentage ← fractions (0.85)` + `← decimals (0.75)`).

## Question storage (`content/questions/aptitude/*.yaml`, `content/questions/reasoning/*.yaml`)

322 questions, 20 files, one file per topic, covering only the 10 aptitude + 6 reasoning + 4 foundation-prerequisite topics (fractions, decimals, division, whole-numbers). Every file's `topic:` matches exactly one syllabus topic id.

| file | questions |
|---|---|
| aptitude/fractions.yaml | 33 |
| aptitude/simplification.yaml | 34 |
| aptitude/percentage.yaml | 25 |
| aptitude/area.yaml | 17 |
| aptitude/compound-interest.yaml | 16 |
| aptitude/ratio-and-proportion.yaml | 19 |
| aptitude/simple-interest.yaml | 18 |
| aptitude/time-and-work.yaml | 20 |
| aptitude/volume.yaml | 15 |
| aptitude/hcf.yaml | 13 |
| aptitude/lcm.yaml | 14 |
| aptitude/decimals.yaml | 8 |
| aptitude/division.yaml | 8 |
| aptitude/whole-numbers.yaml | 8 |
| reasoning/alpha-numeric.yaml | 17 |
| reasoning/number-series.yaml | 16 |
| reasoning/puzzles.yaml | 15 |
| reasoning/dice.yaml | 10 |
| reasoning/logical.yaml | 8 |
| reasoning/visual.yaml | 8 |

**Zero content coverage**: all of General Studies (75/200 marks, including `gs.indian-polity`'s 19 defined-but-empty topics), all of General English (100/200), all of General Tamil (alternate 100/200). Coverage is 25 of the exam's 200 marks (12.5%).

### Question YAML schema

File header (once per file):
```yaml
topic: aptitude.percentage
language: en
source: authored
questions:
  - id: percentage-001
    ...
```
Per-question fields:
```yaml
- id: percentage-001
  difficulty: 0.20                # float 0..1
  estimatedSeconds: 30
  question: "What is 25% of 160?"
  options: ["40", "35", "45", "50"]   # >=4 required
  answer: 0                       # index into options, never text
  explanation: "..."               # required
  trap: "..."                      # optional; missing is a warning, not an error
  source: tnpsc-2018                # optional per-question override of file-level source
```
No per-question `language` field (file-level only).

### PYQ (real past-paper) tagging

Each file declares a file-level default `source: authored`; individual questions override it with `source: tnpsc-<year>` where transcribed from a real prelims paper:

```
tnpsc-2013   13   tnpsc-2015   16   tnpsc-2016   21   tnpsc-2017   18
tnpsc-2018   24   tnpsc-2022   22   tnpsc-2024   23
Total PYQ-tagged: 137 of 322 questions (42.5%)
```

The README's "no PYQ-tagged content" line is stale — PYQ content has since been authored across several commits. `question.source_year` (the dedicated DB column for this) is never populated; the year lives only inside the `source` string. `selection.mjs`'s `examRelevance()` already reads `source` and scores `tnpsc-*` highest, so PYQ questions already win selection without further engine work.

## `scripts/validate-content.mjs` — enforced rules, confirmed by running it

Output from this audit's run: `topics in tree: 40`, `questions validated: 322`, `syllabus coverage: 4/23 units split into topics (260 questions' worth still to transcribe)`, `content OK`.

**Syllabus checks**: every subject/chapter needs an `id`; chapter needs numeric `question_count`; topic ids globally unique; `transcribed: true` chapters need ≥1 topic; sum of non-Tamil chapter `question_count` must equal `total_questions`; every prerequisite edge must reference known topic ids, no self-reference, `strength ∈ (0,1]`.

**Question checks**: file's `topic` must exist in the syllabus tree; `language` must be `ta`/`en`. Per question: unique global `id`, non-empty `question`/`explanation`, `options` array of ≥4 with no duplicate options, `answer` an in-bounds integer index, `difficulty ∈ [0,1]`, `estimatedSeconds` positive if present. Duplicate detection via hash of `language + normalized question text`. Missing `trap` is a warning only, never fails the build.

## Content → database relationship

`content/` is the versioned source of truth; the database is downstream and disposable (`scripts/seed.mjs` is idempotent, safe to re-run against a wiped DB). This was directly exercised in this audit: migrate → validate → seed ran cleanly end to end against a freshly-initialized Postgres instance with zero manual intervention.
