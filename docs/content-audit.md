# Content Audit — Current State (2026-11-06)

Source of truth:
- `content/syllabus/prelims-495.yaml`
- `content/syllabus/mains-583.yaml`
- `content/syllabus/platform-manifest.json`
- `content/questions/**`
- `scripts/validate-content.mjs`

## Syllabus structure

The current syllabus contains **353 canonical topics** across 29 course units:

- Preliminary Group II / IIA, code 495: 217 topics.
- Group IIA Mains, code 583: 136 topics.
- Every one of the 29 course units is transcribed into topics.

The validator currently reports:
- 353 topics in the tree.
- 597 questions validated.
- 29/29 units split into topics.
- `content OK`.

## Question-bank coverage

There are 29 YAML question files containing 597 English questions.

| Area | Questions |
|---|---:|
| Aptitude | 475 |
| Reasoning | 111 |
| Indian Polity | 11 |
| General Science | 0 |
| Geography | 0 |
| Indian History / National Movement | 0 |
| Economy / Tamil Nadu administration | 0 |
| Tamil Nadu history / culture | 0 |
| General English | 0 |
| General Tamil | 0 |
| Group IIA Mains | 0 |
| **Total** | **597** |

Only 29 of 353 syllabus topics currently have question-bank content (8.2%). All current authored question files use English. Do not infer that a fully transcribed syllabus means its lessons or MCQs exist.

## Retrieval classifier mapping audit

Every topic in both syllabus files was tested with explicit topic-heading text and the correct exam context.

| Curriculum | Topics | Exact | Ambiguous / review | Unmapped |
|---|---:|---:|---:|---:|
| Preliminary 495 | 217 | 200 | 17 | 0 |
| Group IIA Mains 583 | 136 | 127 | 9 | 0 |
| **Total** | **353** | **327** | **26** | **0** |

Ambiguous topic matches remain review-required and are not auto-assigned.

## Retrieval inventory and extraction findings

The local retrieval database contained 474 resources: 265 complete, 200 blocked, 3 duplicates, 5 failed, and 1 quarantined. Resource types were 391 study material, 47 current affairs, 26 question papers, 7 mock tests, and 3 MCQ resources.

A read-only dry-run against 10 completed MCQ/mock-test resources detected 1,021 candidates; 995 had four parsed options and 0 had an explicit answer key extracted. Sampled Tamil PDFs contained materially corrupted OCR text. No candidates were inserted or published.

The extractor was fixed to split multiple inline option markers on the same PDF text line. This improves layout parsing but does not solve missing answer keys or Tamil OCR quality.

## Pipeline rules and safety

- AI classification maps content to the live subject → chapter → topic structure.
- Every MCQ and note must retain its source page.
- Missing answer keys remain review-required; the classifier must not infer answers.
- Oversized uploads are split into bounded chunks. Files exceeding the safe 40-chunk limit fail closed rather than producing partial output.
- Uploaded questions and resources remain DRAFT until human approval.
- PYQs remain excluded from ordinary learner content.
- Learner lesson APIs return only PUBLISHED lesson/resource content.

See `docs/content-pipeline-audit-2026-11-06.md` for the detailed test results, remaining integration blockers, and next execution order.
