# Content pipeline database E2E — 6 November 2026

## Test environment

- PostgreSQL 18 disposable cluster created under `/tmp/tnpsc-pgdata`, listening on `127.0.0.1:55432`.
- Fresh isolated database `nova`; the system PostgreSQL 18 `main` cluster remained stopped and untouched.
- All 62 migrations applied successfully.
- Canonical seed run for English and Tamil: 353 syllabus topics, 29 chapters, 6 subjects, 597 published authored questions, 24 published lessons. English/Tamil language seed runs were separate; authored question YAML contained 597 English questions and no Tamil questions.
- Retrieval SQLite inventory: 474 resources (265 `complete`, 200 `blocked`, 3 `duplicate`, 5 `failed`, 1 `quarantined`); 0 extracted retrieval questions.

## Database coverage snapshot

| Content type | Count | Topic coverage |
|---|---:|---:|
| Published authored MCQs | 597 | 29 / 353 topics (8.2%) |
| Published structured lessons | 24 | 24 / 353 topics (6.8%) |
| Published study-note resources | 0 | 0 / 353 topics |
| Draft MCQs / lessons / resources after cleanup | 0 | 0 |

The coverage matrix CSV/JSON was regenerated with database counts per topic. The retrieval extraction sample audit is recorded separately in `docs/retrieval-extraction-sample-audit-2026-11-06.md`. Counts describe this disposable, freshly seeded database only; they are not production database counts. Retrieval download inventory is not treated as learner-published content.

## Executed checks

- `scripts/content-engine-db-e2e.mjs`: PASS — publication schema, idempotency lookup, lesson staging, transaction rollback.
- `scripts/content-engine-review-e2e.mjs`: PASS — adaptive plan learner isolation, role and subject-scope checks, question/lesson review RBAC, source evidence, approval, publication lineage, learner lesson visibility, versioning, rollback and rejection.
- `scripts/content-upload-processing-e2e.mjs`: PASS — authenticated upload queue, immutable local source object, explicit batch-start endpoint, status polling, persisted failure state when Gemini is not configured, and source retention for retry. A failed classification created no reviewable content.
- The same upload E2E also exercised the actual PDF commit endpoint: an MCQ without `humanVerified` was rejected; a source-verified MCQ and study note were staged as DRAFT; learners could not see the draft; after admin review both became PUBLISHED and the learner lesson API returned the approved note.
- Focused classifier/content-quality tests: 10 passed, 0 failed.
- Content validator: 353 topics, 597 questions, 29/29 syllabus units, content OK.

## Still not verified

- Live Gemini classification is not verified: no provider key was supplied. The upload processing E2E deliberately asserts the correct, visible failure path in this case; it is not a successful AI extraction test.
- This test database is disposable and isolated. The stopped system database was not started or modified.
- Production/Vercel database and storage integration was not exercised.
- OCR remains English-only in retrieval and absent in the production Node PDF extractor; Tamil scanned documents remain blocked from automated publication.
- Retrieved resources still need per-topic evidence mapping and content-quality scoring before they can count as study notes or lessons.

## Re-run

With a disposable PostgreSQL database migrated and seeded, run:

```bash
DATABASE_URL=postgresql://... node scripts/content-engine-db-e2e.mjs
DATABASE_URL=postgresql://... APP_URL=http://127.0.0.1:3108 CRON_SECRET=test CONTENT_ENGINE_REVIEW_E2E_PORT=3108 node scripts/content-engine-review-e2e.mjs
DATABASE_URL=postgresql://... CONTENT_UPLOAD_E2E_PORT=3112 node scripts/content-upload-processing-e2e.mjs
```

The upload E2E intentionally runs without `GEMINI_API_KEY` and validates failure safety plus the downstream manual review/publish path.
