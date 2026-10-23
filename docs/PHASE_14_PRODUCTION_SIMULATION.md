# Phase 14 — Production Simulation & Failure Engineering

## Objective

Exercise NOVA under production-like failure conditions without touching production infrastructure. The simulation validates security boundaries, database connectivity, persistent worker recovery, distributed rate limits, readiness, environment validation, and backup/restore integrity.

## Implemented

### 1. Production simulation harness

`scripts/phase14-production-simulation.mjs`

Checks:
- PostgreSQL connectivity.
- Presence of Phase 14 production tables.
- Distributed rate-limit window enforcement.
- Concurrent rate-limit correctness.
- Production environment rejects missing secrets/configuration.
- Public `/api/health` and `/api/ready` behavior.
- Unauthenticated learner API denial.
- Unauthenticated admin API denial.
- Cron endpoint denial without `CRON_SECRET`.
- Test ownership boundary remains protected.
- Persistent content worker stale-job recovery.
- Processing queue remains queryable after recovery.

### 2. Backup/restore verification

`scripts/verify-backup-restore.mjs`

The test performs a non-destructive local disaster-recovery simulation:

1. Snapshot the current PostgreSQL database with `pg_dump`.
2. Create a temporary database.
3. Restore the snapshot into the temporary database.
4. Verify critical record counts (`app_user`, `question`, `content_lineage`, `content_processing_job`).
5. Delete the temporary database and dump.

No application database is modified by the restore test.

## Verification results

### Automated application suite

- `npm test`: **72 passed / 0 failed**
- `npm run validate:content`: **44 topics / 586 questions / content OK**
- `npm run build`: **passed**

### Phase 14 simulation

**14 checks passed.**

Notable results:
- DB connectivity: PASS
- schema readiness: PASS
- distributed rate limit: PASS
- concurrent rate limiting: PASS
- production env rejection: PASS
- health/readiness: PASS
- auth/ownership boundaries: PASS
- cron protection: PASS
- stale worker recovery: PASS

### Disaster recovery simulation

Backup/restore completed successfully.

Restored verification snapshot:
- `app_user`: 3
- `question`: 324
- `content_lineage`: 0
- `content_processing_job`: 0

The zero lineage count is expected for the current database because no imported document has yet produced new lineage records; provenance is created by the ingestion pipeline for future imports.

## Safety boundary

This phase deliberately does **not** stop the live PostgreSQL service, delete application tables, revoke real production credentials, or inject failures into production infrastructure. Those operations belong to a controlled staging environment with an isolated database and object-storage namespace.

## Remaining production-simulation work

Before declaring the final production release gate green, execute these tests against an isolated staging stack:

- Kill/restart the content worker while a real document is processing.
- Simulate object-storage timeout and recovery.
- Simulate AI provider timeout/rate-limit and verify retry/backoff behavior.
- Simulate PostgreSQL outage and verify `/api/ready` transitions to 503 and recovers.
- Run concurrent learner sessions through web and Android against the same backend.
- Run real Android emulator/device smoke tests and screenshot-based rendering checks.
- Validate CDN/WAF/HTTPS behavior and production cookies.
- Perform a scheduled backup restore using the production backup mechanism.

These are release-gate staging tests, not reasons to claim that the current local environment is production itself.
