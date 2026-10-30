# Phase 24 — Isolated Content Engine Database E2E

## Purpose

This phase adds a production-like PostgreSQL test boundary for the Content Intelligence Engine publication path without touching learner production data.

The CI job provisions an ephemeral PostgreSQL 16 instance, applies the repository migrations, seeds the baseline schema/data, and exercises the publication persistence boundary.

## Covered

1. Required publication/staging/review columns exist.
2. A real curriculum topic can receive staged engine content.
3. Publication identity and manifest hash can be queried for idempotency.
4. Lesson provenance is persisted in staging.
5. Staging and publication writes participate in one PostgreSQL transaction.
6. Rollback removes both publication and staged content.
7. A second migration pass is idempotent.

## Deliberately not covered

This job does not pretend to be the full authenticated HTTP E2E suite. Authentication, `content.create`, topic-scope authorization, admin approval/rejection, and learner-facing rendering remain separate runtime checks because those require the Next.js application process and its auth/session configuration.

The existing runtime contract suite remains responsible for deterministic manifest behavior and mutation detection.

## CI

Workflow:

`.github/workflows/content-engine-db-e2e.yml`

The database is disposable and contains no production credentials or learner data.

## Safety invariants

- No PYQ is inserted by this fixture.
- No learner-facing publication is performed.
- No production database is contacted.
- Test records are rolled back before the job completes.
- Migration idempotency is checked explicitly.
