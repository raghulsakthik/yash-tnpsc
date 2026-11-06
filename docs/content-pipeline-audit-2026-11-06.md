# TNPSC Content Pipeline Audit — 2026-11-06

## Scope

Canonical repository: `/home/yash/tnpsc`

Reviewed the course taxonomy, platform question bank, retrieval-engine resource classifier, PDF MCQ extraction, platform AI classification/quality gate, review approval flow, learner lesson API, and the admin upload surfaces.

## Current course and question-bank state

The current syllabus files contain **353 canonical topics**:

- Preliminary Group II / IIA (code 495): 217 topics.
- Group IIA Mains (code 583): 136 topics.
- 29/29 course units are split into syllabus topics.
- `npm run validate:content`: **597 questions validated**.

Question-bank coverage is still narrow:

| Course area | Questions |
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

Only 29 of 353 syllabus topics currently have question-bank files (8.2%). All 597 authored question-bank entries are English. The course tree is substantially more complete than the question bank; course completeness must not be reported as learning-content completeness.

## Course labelling coverage

The retrieval classifier was tested against every topic name in both syllabus files using explicit topic headings and the corresponding exam/group/stage context.

| Curriculum | Topics | Exact mapping | Ambiguous / review | Unmapped |
|---|---:|---:|---:|---:|
| Preliminary 495 | 217 | 200 | 17 | 0 |
| Group IIA Mains 583 | 136 | 127 | 9 | 0 |
| **Total** | **353** | **327** | **26** | **0** |

The 26 ambiguous mappings are intentionally not auto-assigned. They include overlapping terms such as Union/State, agriculture, education, and cross-language vocabulary. The classifier returns candidate topic IDs and requires human review. A regression test now checks all 353 syllabus topics.

## Retrieval inventory

Local retrieval SQLite inventory at audit time:

- 474 resources total.
- 265 completed downloads.
- 200 blocked.
- 3 duplicates.
- 5 failed.
- 1 quarantined.
- Resource types: 391 study material, 47 current affairs, 26 question papers, 7 mock tests, 3 MCQ resources.
- The extraction database contained 0 question rows before this audit.

The resource counts describe download/classification state, not verified lesson/MCQ conversion.

## Real PDF extraction dry-run

A read-only extraction pass was run against the 10 completed non-PYQ resources labelled MCQ or mock test. No database rows were inserted.

- 1,021 MCQ candidates detected.
- 995 candidates had four parsed options.
- 0 candidates had an explicit answer key parsed.
- 5 candidates had very short question text.
- Tamil PDFs show severe OCR corruption in sampled text and must not be treated as usable learner questions.

The extractor initially merged options printed side-by-side on the same PDF text line (for example, `(A) Ampere (B) Volt`). The parser now splits inline option markers and preserves option labels. The dry-run confirms the English examples now split into four separate options. Answer keys remain absent, so these are review candidates only. No candidates were published or inserted.

## Platform content pipeline

The verified intended path is:

1. Retrieval engine downloads and classifies a source.
2. Admin retrieval analysis queues a completed non-PYQ file for platform processing.
3. Platform text extraction and AI classification split it into MCQs and study-note resources, mapped to the live subject → chapter → topic tree.
4. Quality checks retain page provenance, topic confidence, option validity, answer evidence, and source-text overlap.
5. Admin commit stages questions and `topic_resource` rows as DRAFT.
6. Review approval publishes the question and study-resource rows.
7. Learner `/api/lesson/[topic]` returns the published lesson plus published topic-resource notes.
8. The separate content-engine generator can use approved non-PYQ notes as evidence to generate a structured lesson and original MCQs, which enter the human review queue before publication.

PYQ detection and the content-engine import boundary continue to block ordinary publication of previous-year question-paper content.

## Changes made in this audit

- Large plain-text/DOCX pages are now split at whitespace boundaries when a single paragraph exceeds the classifier chunk size.
- Classification still supports 45,000-character chunks with concurrency 3 and a maximum of 40 chunks.
- Documents exceeding the safe 40-chunk limit now fail with `DOCUMENT_TOO_LARGE`; the old behaviour could return only the first 40 chunks with a truncation flag, allowing partial results to continue through processing.
- The AI prompt now requires a real source page number for every extracted MCQ and note, not only diagram-dependent items. This matches the quality gate and provenance contract.
- Answerless MCQs are retained as `REVIEW_REQUIRED` candidates with `answerIndex: null`; the classifier is explicitly instructed not to solve or infer answers. Invalid non-null answer indexes remain blocked. The commit endpoint now enforces the existing question quality gate before database insertion, so answerless/invalid candidates fail with a clear validation error instead of a PostgreSQL constraint error. Empty duplicate-only topic batches are skipped.
- Retrieval MCQ extraction now parses multiple inline option markers on one text line.
- Added large-document, no-partial-truncation, answerless-MCQ, and full 353-topic mapping regression tests.
- Fixed the production `/admin/upload` flow to explicitly start the persisted processing batch after queue creation; previously it polled without triggering execution.
- Added an admin answer-selection control and explicit source-verification checkbox for each included MCQ. The commit API independently enforces both a valid answer index and `humanVerified: true`, so a forged or stale client cannot bypass the gate.

## Verification

- Platform Node test suite: **415 passed, 0 failed**.
- Retrieval Python unit suite: **18 passed, 0 failed**.
- Content validation: **597 questions, 353 topics, 29/29 units, content OK**.
- Next.js production build: compiled, TypeScript completed, and all 46 static pages generated.
- `git diff --check`: passed at the audit checkpoint.

The classifier's multi-chunk integration test uses a mocked Gemini HTTP response. A live Gemini run was not possible because `GEMINI_API_KEY` is not configured in the local environment.

## Remaining blockers — do not mark complete

1. **Prototype parity:** the production Next.js `/admin/upload` page already uses the real queue/process/status/commit APIs. The separate legacy `.nova-zip-ui/src/components/admin/ContentUploadAIView.tsx` remains a simulation and must not be mistaken for the production upload surface. This audit pass fixed a production bug where the UI queued a batch and polled it but never called the batch-start endpoint, leaving jobs permanently QUEUED. It also adds mandatory per-question answer selection and explicit human verification before commit.
2. **Live AI generation:** local AI lesson/MCQ generation cannot be verified until a Gemini key is configured in the runtime environment.
3. **Question-bank breadth:** 29/353 topics have questions; all 597 are English and none cover the language tracks or Group IIA Mains.
4. **Answer-key extraction:** the 10-resource dry-run found no explicit answer keys. Human verification is required before any of those candidates can be published.
5. **Tamil OCR:** sampled Tamil documents are materially corrupted. They need a better Tamil OCR/layout path or manual correction before extraction.
6. **Study-note quality:** the platform can store approved topic-resource notes and expose them with the learner lesson API, but the retrieved inventory has not yet been quality-scored end-to-end for completeness, factual correctness, duplicate coverage, and lesson usefulness.

## Next execution order

1. Bring the legacy prototype upload component into parity only if that prototype remains an intended product surface; the production Next.js `/admin/upload` workflow is now wired to authenticated APIs.
2. Add an answerless-question review state that requires the reviewer to select and verify the answer before commit.
3. Add OCR confidence/language-quality checks and quarantine corrupted Tamil extraction rather than creating MCQ candidates.
4. Run a live, small-sample Gemini classification and lesson-generation test after configuring the provider key; then test representative large documents.
5. Build a coverage matrix for study notes, structured lessons, and MCQs by every syllabus topic and language; prioritise uncovered General Studies, English, Tamil, and Mains topics.
6. Only then run a controlled batch import, retaining DRAFT/review gates and PYQ exclusion.
