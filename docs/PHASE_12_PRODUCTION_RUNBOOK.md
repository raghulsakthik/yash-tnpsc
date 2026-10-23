# NOVA Phase 12 — Production Runbook

## Required services
1. Next.js web application
2. Managed PostgreSQL
3. Private S3-compatible object storage
4. Content worker process
5. External scheduler for protected cron endpoints where required
6. CI/CD pipeline

## Environment
Production must provide `DATABASE_URL`, HTTPS `APP_URL`, a 32+ character `CRON_SECRET`, and S3 credentials. Never commit these values.

## Database
Run migrations before the web process accepts traffic:

```bash
npm run db:migrate
```

Then verify:

```text
GET /api/health
GET /api/ready
```

`/api/ready` must report the current migration ledger version and database readiness.

## Content worker
Run separately from the web server:

```bash
npm run content-worker
```

For a controlled single-job worker run:

```bash
node scripts/content-worker.mjs --once
```

Use a process supervisor/container restart policy in production. Multiple workers are supported because job claiming uses PostgreSQL row locking with `SKIP LOCKED`.

## Content upload flow
Admin → authenticated content API → object storage → persistent DB job → worker → extraction → classification → validation → review → publish → lineage.

Raw source files are not intended to remain as PostgreSQL blobs in production.

## Backups
PostgreSQL backups must be enabled through the managed database provider. At minimum:
- automated daily backups;
- point-in-time recovery where provider-supported;
- retention appropriate to the production SLA;
- periodic restore drill into an isolated database.

Object storage must have versioning/retention appropriate to the content policy and should be private by default.

## Deployment order
1. Apply database migrations.
2. Configure production secrets/environment.
3. Verify private object storage access.
4. Start the content worker.
5. Deploy the Next.js web application.
6. Verify `/api/health` and `/api/ready`.
7. Run authentication, ownership, content queue and adaptive smoke tests.
8. Only then expose production traffic.

## Failure handling
- Web process failure: restart web instance; PostgreSQL remains canonical.
- Worker failure: supervisor restarts worker; stale PROCESSING jobs become reclaimable after 10 minutes.
- Object storage failure: new content jobs fail before publishing; no content should be silently marked complete.
- Database failure: readiness fails and traffic should be removed from service by the hosting layer.
- CI failure: do not deploy.

## Release gate
Phase 12 is considered engineering-complete only when the above production boundary is provisioned and the Phase 13 integration/E2E suite is green against a production-like environment. The code now contains the production boundary; provider provisioning and the final release validation are operational steps, not reasons to bypass CI.
