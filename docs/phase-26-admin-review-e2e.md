# Phase 26 — Admin Review E2E

This phase verifies the authenticated content-engine review lifecycle against disposable PostgreSQL and the Next.js HTTP application.

## Covered

1. Import a lesson + MCQ through `/api/admin/content-engine/import`.
2. Confirm imported question is `DRAFT` and staged lesson is `PENDING`.
3. Approve the real review batch through `/api/admin/content/review/[batchId]`.
4. Confirm question becomes `PUBLISHED`, staging becomes `PUBLISHED`, and the platform `lesson` row exists.
5. Import a second publication.
6. Reject its review batch.
7. Confirm question becomes `ARCHIVED`, staging becomes `REJECTED`, and the batch becomes `REJECTED`.
8. Confirm decided batches disappear from the pending review queue.
9. Clean up all fixtures and the temporary admin session.

## Security fixes

- The platform import boundary independently rejects explicit PYQ markers.
- Review decisions persist the authenticated `accountId` as reviewer metadata.

## CI

`.github/workflows/content-engine-review-e2e.yml` provisions PostgreSQL 16, installs dependencies, runs migrations/seed/validation, starts Next.js, and executes the authenticated review harness.

The test is isolated and never targets the production database.
