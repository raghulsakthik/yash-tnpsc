# Content Audit

Scope: `content/syllabus/prelims-495.yaml`, `content/questions/**`, `scripts/validate-content.mjs`. Factual inventory only.

## Syllabus schema (`content/syllabus/prelims-495.yaml`)

Top-level: `exam: tnpsc-prelims-495`, `code: 495`, `dated: 2024-12-12`, `total_questions: 200`, `subjects: []`, `prerequisites: []`.

- **Subject**: `id`, `name`, `sort_order`, optional `language`, `chapters: []`.
- **Chapter**: `id`, `name`, `sort_order`, `question_count` (the official paper's real count for that chapter — the sole input to exam-weight; comment: "never invent a weight"), `transcribed` (bool — whether syllabus prose has been split into topics), `topics: []`.
- **Topic**: `{id, name}` — flat.
- **Prerequisite edge**: `{topic, requires, strength}`, `strength ∈ (0,1]`.

Four subjects:

1. **general-studies** (75 Q) — 6 chapters. Only `gs.indian-polity` is `transcribed: true` (19 topics defined). The other 5 GS chapters (general-science, geography-india, history-culture-national-movement, indian-economy-tn-development, tn-history-culture-movements) are `transcribed: false`, empty `topics: []` — 60 of 75 GS marks have no topic breakdown yet.
2. **aptitude-mental-ability** (25 Q) — 3 chapters, all `transcribed: true`: `apt.foundation` (0 Q, prerequisite-only — whole-numbers, division, fractions, decimals), `apt.aptitude` (15 Q — simplification, percentage, hcf, lcm, ratio-and-proportion, simple-interest, compound-interest, area, volume, time-and-work), `apt.reasoning` (10 Q — logical, puzzles, dice, visual, alpha-numeric, number-series).
3. **language-en** (100 Q) — 7 chapters, all `transcribed: false`, empty topics.
4. **language-ta** (same 100 Q split) — same structure, all untranscribed; excluded from the `total_questions` sum check (alternate-language track; only one of en/ta is seeded per learner).

Sum check: GS(75) + aptitude(25) + English(100) = 200 = `total_questions`.

15 prerequisite edges, all within the aptitude chain (e.g. `division ← whole-numbers (0.80)`, `percentage ← fractions (0.85)` + `← decimals (0.75)`, `compound-interest ← simple-interest (0.85)`). No edges touch GS, language, or reasoning topics.

## Question bank — corrected counts

**322 questions total**, 20 files, one file per topic — all under `apt.aptitude`/`apt.reasoning`/`apt.foundation` topics (fractions, decimals, division, whole-numbers plus the 10 aptitude + 6 reasoning topics). Every file's `topic:` matches exactly one syllabus topic id.

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

**Zero content coverage**: all of General Studies (75/200 marks, including `gs.indian-polity`'s 19 defined topics — topics exist, no question files), all of General English (100/200), all of General Tamil (alternate 100/200). Coverage is limited to the 10 Aptitude + 6 Reasoning + 4 foundation-prerequisite topics — 25 of the exam's 200 marks (12.5%) have any question bank at all.

## PYQ (real past-paper) tagging — corrected finding

Each file declares a file-level default `source: authored`, but **individual questions override it with `source: tnpsc-<year>`** where the question is transcribed from a real prelims paper. This is a per-question field, not file-level, and recent commits (`git log -- content/`) added these in batches:

```
source: tnpsc-2013   13 questions
source: tnpsc-2015   16 questions
source: tnpsc-2016   21 questions
source: tnpsc-2017   18 questions
source: tnpsc-2018   24 questions
source: tnpsc-2022   22 questions
source: tnpsc-2024   23 questions
——————————————————————————————
Total PYQ-tagged     137 of 322 questions (42.5%)
```

This directly contradicts the README's "What is deliberately absent" line ("no PYQ-tagged content ... real TNPSC papers are pending OCR tooling") — that line is now stale; PYQ content has since been hand-authored into the bank across 6 commits. There is no `source_year` field populated anywhere (0 matches repo-wide) — the year is encoded only inside the `source` string (`tnpsc-2018`, etc.), even though the `question.source_year INT NULL` column exists in the DB schema (`V1__init.sql`) specifically for this. The DB column is unused by both the seed script's mapping and the content files as currently authored — worth reconciling (see `implementation-gap.md`).

`selection.mjs`'s `examRelevance()` already reads `source`: `source.startsWith('tnpsc-') → 1.0` (highest), `'textbook' → 0.6`, else `0.4` — so PYQ-tagged questions already score highest in question selection without any additional engine work.

## Question YAML schema

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
No per-question `language` field (file-level only). No `source_year` field used anywhere despite the DB column existing for it.

## `scripts/validate-content.mjs` — enforced rules

Runs in CI, exits 1 on error (warnings don't fail the build).

**Syllabus**: every subject/chapter needs an `id`; chapter needs numeric `question_count`; topic ids globally unique; `transcribed: true` chapters need ≥1 topic; sum of non-Tamil chapter `question_count` must equal `total_questions`; every prerequisite edge must reference known topic ids, no self-reference, `strength ∈ (0,1]`.

**Questions** (walked recursively under `content/questions/`): file's `topic` must exist in the syllabus tree; `language` must be `ta`/`en`. Per question: unique global `id`, non-empty `question`/`explanation`, `options` array of ≥4 with no duplicate options, `answer` an in-bounds integer index, `difficulty ∈ [0,1]`, `estimatedSeconds` positive if present. Duplicate-question detection via hash of `language + normalized question text`. Missing `trap` is a warning only.

**Reporting**: prints topic count, validated question count, syllabus coverage (units split into topics vs. not).
