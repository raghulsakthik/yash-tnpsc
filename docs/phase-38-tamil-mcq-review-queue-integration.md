# Phase 38 — Tamil MCQ Review Queue Integration

## Objective

Connect extracted question candidates to the platform's existing DRAFT and admin review workflow without silently storing Tamil content as English or accepting unverified answers.

## Delivered

- Fixed the content commit API to accept per-question language (ta or en) and persist it to the correct question-language partition.
- Duplicate checks now run against the matching language only. Tamil and English normalized hashes are kept separate.
- Questions are grouped into review batches by both canonical topic and language.
- Preserved existing English question IDs and existing English PYQ IDs for backward compatibility; Tamil imports use language-qualified IDs.
- Added strict language validation. Unsupported language codes fail instead of falling back to English.
- Extended Admin Source Library Preview MCQs with an import-review workflow:
  - Load the real canonical syllabus topic tree.
  - Select individual candidates.
  - Assign each selected question to an exact syllabus topic.
  - Explicitly select the correct answer.
  - Write a substantive explanation.
  - Confirm source-level human verification.
  - Stage only fully verified candidates through the existing content commit endpoint.
- Source file, source page and question number are retained in the existing content-lineage metadata.
- Imported questions enter DRAFT review batches. They are not learner-visible until the separate review queue approval action.
- Changing the answer or explanation resets the human-verification checkbox.

## Safety boundaries

- Printed answer markers from the source are shown as unverified and are never preselected.
- No answers are inferred by OCR or the importer.
- No topic is automatically assigned from incidental text.
- No unselected candidate is imported.
- No content is published by this flow.

## Validation

- Node tests: **419 passed**.
- Next.js production build: **PASS**, including the retrieval admin page and commit API.
- Added tests for Tamil/English language preservation, explicit default language, and rejection of unsupported language values.
- Database-backed E2E: **PASS** using a disposable PostgreSQL 18 cluster on port 55433. Applied 62 migrations and seeded the test database (5 subjects, 22 chapters, 308 topics, 597 questions).
- Verified the unverified-answer commit is rejected, then staged a real Tamil MCQ and asserted its database language is ta, its status is DRAFT, and its source page is preserved.
- Verified the learner lesson response does not contain the DRAFT study resource before review; after the two separate review approvals, the question/resource are PUBLISHED and the learner endpoint returns the approved resource.
- Re-ran the upload queue integration: without a Gemini key, processing fails visibly, retains the original source object and creates no review content.
- The E2E fixture deletes its test accounts, questions, resources, review batches, jobs and local source object in its finally block. The disposable database is stopped and removed after validation.
- The normal application PostgreSQL service on localhost:5432 remains stopped; no production database or production content was changed.
