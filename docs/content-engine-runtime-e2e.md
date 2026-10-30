# Phase 22 — Content Engine Runtime E2E Harness

## Objective

Provide a controlled runtime test boundary for:

`approved engine content → manifest → authenticated import API → review batch → admin approval → learner-facing lesson/question`

The harness deliberately separates deterministic contract tests from environment-dependent PostgreSQL/authentication tests.

## Safety rules

- Never use real learner content for destructive tests.
- Use a dedicated fixture publication ID.
- Do not use PYQs as positive fixtures.
- Never bypass `content.create` permission or topic scope.
- Import remains pending review; the import endpoint does not directly publish learner content.
- Approval is the only transition that publishes staged engine lessons/questions.
- Replay of the same publication/manifest must be rejected as already imported.

## Test matrix

| Case | Expected result |
|---|---|
| Valid authenticated import | `201`, imported and pending review |
| Invalid manifest hash | `409`, no database mutation |
| Missing content permission | `403` |
| Out-of-scope topic | `403`, transaction rolled back |
| PYQ fixture | blocked before publication |
| Missing provenance | `400`, transaction rolled back |
| Duplicate publication | `409`, `ALREADY_IMPORTED` |
| Duplicate question | `400`, transaction rolled back |
| Admin approval | review batch becomes `APPROVED`; learner content becomes published |
| Admin rejection | review batch becomes `REJECTED`; staged lessons/questions are not learner-visible |

## Runtime procedure

1. Run migrations against a disposable/test PostgreSQL database.
2. Create or select an admin account with `content.create` and access to the fixture topic.
3. Build the approved fixture in the content engine.
4. Generate the manifest hash using the engine adapter.
5. POST the manifest to `/api/admin/content-engine/import` using the test authentication mechanism.
6. Verify the response contains `reviewBatchIds` and `IMPORTED_PENDING_REVIEW`.
7. Query the review batch and verify the question remains `DRAFT` and the staged lesson remains `PENDING`.
8. Approve the batch through the existing content-review workflow.
9. Verify the question is `PUBLISHED` and the platform `lesson` row exists for the topic.
10. Verify replay is rejected.
11. Run the negative cases from the matrix and verify rollback/no partial publication.

## Current implementation

`tests/content-engine-runtime.smoke.mjs` verifies the runtime manifest contract without requiring production credentials or a live database. Environment-dependent execution is intentionally not represented as passed until a test database and authenticated test account are available.
