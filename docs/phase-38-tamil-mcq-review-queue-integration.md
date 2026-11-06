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
- Live PostgreSQL staging test remains pending because the app database on localhost:5432 is stopped in this environment. The code path is build/test validated but no new question rows or review batches have been inserted in this session.
