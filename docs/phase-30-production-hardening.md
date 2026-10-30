# Phase 30 — Production Hardening & Readiness Gate

## Objective

Harden the Content Intelligence Engine → TNPSC platform publication boundary so that a learner cannot observe an unreviewed engine candidate and an administrator cannot accidentally create two active engine lesson versions for one topic.

## Database protections

`V26__content_engine_hardening.sql` adds:

- a partial unique index allowing only one `PUBLISHED` engine lesson version per topic;
- an active-lineage index for fast learner/audit queries;
- an audit action index for bounded history reads.

The uniqueness rule is enforced by PostgreSQL rather than relying only on application logic, protecting against concurrent approval requests.

## Existing transaction protections

Content import and review operate inside database transactions. Approval, version creation, live lesson update and lineage publication are committed together. Rollback restores the selected immutable snapshot and updates the live lesson and lineage in one transaction.

## Permission protections

The admin APIs require the existing platform permission model and topic scope. Version history and rollback cannot be accessed outside the administrator's permitted subject/topic scope.

## Learner visibility

The existing learner-facing `lesson` record remains the serving pointer. Engine staging, pending review batches, rejected versions and superseded snapshots do not replace it.

## Verification contract

`scripts/content-engine-hardening-check.mjs` verifies that the required versioning, audit, rollback and hardening artifacts exist and that the database-level single-active-version invariant is present.

The full readiness suite should execute:

1. migration from a clean PostgreSQL database;
2. migration idempotency;
3. authenticated import;
4. PYQ rejection;
5. approval and learner visibility;
6. v2 approval and v1 preservation;
7. rollback to v1;
8. rejected candidate leaves the live version unchanged;
9. duplicate publication replay is idempotent;
10. concurrent approval cannot create two published versions;
11. unauthorized and out-of-scope rollback/version/audit requests are rejected.

## Readiness status

Phase 30 implementation artifacts are committed. CI execution is not claimed until GitHub Actions reports a successful run for the corresponding commit.
