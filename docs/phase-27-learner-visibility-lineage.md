# Phase 27 — Learner Visibility & Content Lineage

## Objective

Ensure Content Intelligence Engine output has an explicit lifecycle and that only approved platform content can become learner-visible.

## Lifecycle

```text
ENGINE PUBLICATION
      |
      v
IMPORTED
  |       |
  |       +--> REJECTED
  v
REVIEW PENDING
  |
  +--> REJECTED
  |
  v
APPROVED / PUBLISHED
```

### Lesson

- Engine lesson is stored in `content_engine_lesson_staging` as `PENDING`.
- It is not copied into the platform `lesson` table until review approval.
- Approval marks staging `PUBLISHED` and creates/updates the platform lesson.
- Rejection marks staging `REJECTED` and never creates a learner lesson.

### MCQ

- Engine MCQ is inserted into `question` as `DRAFT`.
- Approval changes it to `PUBLISHED`.
- Rejection changes it to `ARCHIVED`.
- Existing learner content queries should continue to use the platform's published-status contract.

## Lineage

`content_engine_lineage` now records:

- publication ID
- engine content ID
- content kind (`lesson` / `mcq`)
- platform ID after publication
- topic ID
- source evidence IDs
- engine version
- review batch
- lifecycle status
- publication timestamp

This prevents the platform from losing the relationship between an approved learner item and the engine publication/evidence that produced it.

## Security invariant

The import API is not a learner publication API. It creates staging/DRAFT records and review work only. A successful import response is therefore never evidence that learners can see the content.

The only transition into learner-facing platform content is the existing authenticated admin review approval path.

## E2E coverage

The Phase 26/27 runtime test now verifies:

1. Imported lesson/MCQ are non-published.
2. Imported lineage is `IMPORTED` and retains source evidence.
3. Approval produces published lesson/MCQ and `PUBLISHED` lineage with platform IDs.
4. Approved publication becomes `APPROVED`.
5. Rejected content becomes `ARCHIVED`/`REJECTED` and has no platform ID.
6. Rejected publication becomes `REJECTED`.
7. Decided batches disappear from the pending review queue.

The test runs against disposable PostgreSQL and a real Next.js HTTP server in CI. It does not use production data.
