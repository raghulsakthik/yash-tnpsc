# Phase 37 — Read-Only MCQ Candidate Preview

## Objective

Let administrators inspect actual question-and-option candidates extracted from a retrieved source before any candidate is saved, verified, mapped, or published.

## Delivered

- Added a read-only retrieval-engine endpoint for MCQ candidate preview.
- Added a maximum-page parameter, capped at 30, and used a 12-page default from the admin portal.
- Added an authenticated Next.js admin proxy route guarded by CONTENT_CREATE.
- Added a Preview MCQs action to the Source Library and a scrollable question review panel.
- The panel displays question number, source page, extracted stem, available options, and any printed answer marker explicitly labeled unverified.
- Response includes total candidates, returned count, answerless count, and truncation status.
- Preview returns persisted=false, review_required=true and published=false. It does not call the database insertion method.

## Live resource validation

- Tested actual retrieved resource 397, Group2A Quick Revision General Tamil.pdf.
- Extracted 98 question candidates from its 9-page PDF.
- All 98 candidates contained at least A and B options; all 98 lacked a printed answer marker and therefore require human answer verification.
- The first question retained Tamil text, four options and source page 1.
- The engine questions-table count was 0 before and after the preview request. The preview made no database writes.

## Validation

- Retrieval Python tests: **41 passed**.
- Root Node tests: **415 passed**.
- Next.js production build: **PASS**, including the authenticated MCQ preview API route and Admin Source Library page.
- No content was committed, answer-verified, or published.
