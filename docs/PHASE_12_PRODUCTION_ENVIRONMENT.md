# NOVA Phase 12 — Production Environment Architecture

## Objective

Move NOVA from a development-capable application into a production-shaped system without changing the frozen ZIP frontend or moving adaptive decisions into the client.

Phase 12 is an infrastructure and reliability phase. It does not declare the product production-ready until the remaining external infrastructure, E2E, simulation and deployment gates pass.

## 1. Target production architecture

```text
Web browser / Android app
        |
        | HTTPS
        v
CDN / Edge / WAF
        |
        v
NOVA Next.js application
  - authentication
  - API routes
  - adaptive decision service
  - curriculum/progress
  - admin APIs
  - content review APIs
        |
        +---------------------> Managed PostgreSQL
        |                         - learner state
        |                         - attempts
        |                         - curriculum
        |                         - content metadata
        |                         - lineage/audit
        |
        +---------------------> Object Storage
        |                         - uploaded PDFs/DOCX/images
        |                         - generated page assets
        |                         - future proctoring artifacts
        |
        +---------------------> AI Provider
        |                         - classification
        |                         - explanations
        |                         - content assistance
        |
        +---------------------> Notification Providers
        |                         - FCM / Web Push
        |                         - SMTP
        |                         - WhatsApp Cloud API
        |
        +---------------------> Queue / Redis (Phase 12 infrastructure)
                                  - content jobs
                                  - retries
                                  - rate limits
                                  - scheduled/background work

Background worker
  - content extraction/classification
  - retryable processing
  - long-running jobs
  - scheduled maintenance

Observability
  - structured application logs
  - health/readiness checks
  - deployment/CI logs
  - DB metrics
  - error tracking
```

### Architectural decision

Keep the backend as a modular monolith for now. Do not split NOVA into microservices merely because production infrastructure exists. The adaptive domain remains server-side and framework-independent where practical.

Web and Android continue to use the same API contracts. Android must not receive a separate learning engine or duplicated business rules.

## 2. Environment separation

Required environments:

1. **Development** — local machine, disposable database/data.
2. **Staging** — production-shaped infrastructure with non-production data.
3. **Production** — real learner data and real credentials.

Rules:

- Never use production database credentials locally.
- Never use staging credentials in production.
- Never commit secrets.
- Production `APP_URL` must be HTTPS.
- Production `CRON_SECRET` must be at least 32 characters.
- Deployment platform environment variables are authoritative for secrets.
- `.env.production.example` documents names only; it contains no real secrets.

## 3. Environment validation implemented

`src/lib/env.mjs` now centralizes production configuration.

Production requires:

- `DATABASE_URL`
- `APP_URL`
- `CRON_SECRET`

Production validation additionally enforces:

- HTTPS `APP_URL`
- minimum 32-character cron secret
- positive `DB_POOL_MAX`

Development retains safe local defaults through `.env.local`.

## 4. PostgreSQL architecture

Current application uses one `pg.Pool` per application process.

Production pool controls now include:

- configurable `DB_POOL_MAX`
- 30-second idle timeout
- 5-second connection timeout
- connection recycling through `maxUses`

The database remains the system of record for:

- identity/session state
- learner state
- attempts/mastery
- curriculum progress
- tests/PYQs
- content review
- processing state
- provenance/lineage
- audit information

Production must use managed PostgreSQL with automated backups and point-in-time recovery where the provider supports it.

## 5. Health and readiness

Two operational concepts are required:

### `/api/health`

Checks database connectivity and reports degraded/503 when the database cannot be reached.

### `/api/ready`

Checks database connectivity and verifies the migration ledger can be read. It reports the latest applied migration and returns 503 when the application is not ready to serve production traffic.

Load balancers/deployment platforms should use readiness for traffic decisions rather than relying only on process existence.

## 6. HTTP security baseline implemented

Next.js now emits:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- restrictive `Permissions-Policy`
- production HSTS with one-year max age and subdomains

The session cookie is now `Secure` in production while retaining `HttpOnly` and `SameSite=Lax`.

Do not add a broad Content-Security-Policy until the current script/style/image/font inventory is audited; a broken CSP would be security theatre rather than engineering.

## 7. Background jobs

Serverless request execution must not be treated as a durable worker.

Current cron endpoints are protected by `CRON_SECRET` and Vercel Cron configuration exists for engagement/activity checks.

The persistent content-processing schema from V40 is the durable source of job state.

Production worker design:

```text
API upload
  -> create batch/job row
  -> enqueue job
  -> return 202
  -> worker claims job
  -> extract
  -> classify
  -> validate
  -> ready for review
  -> admin approval
  -> commit/publish
```

The worker must be idempotent and resume from persisted job state. Long document processing must not depend on one HTTP request remaining alive.

## 8. Object storage

Raw uploaded documents must not become durable production data on the application filesystem.

Production storage target:

- S3-compatible object storage
- private buckets
- server-side encryption
- lifecycle policies
- signed URLs for controlled access

The database stores metadata and object keys, not large document binaries.

This is still an infrastructure task before Phase 12 can be marked complete.

## 9. Redis / queue

Redis is intentionally not introduced merely for caching.

When enabled in production it should serve concrete infrastructure needs:

- distributed rate limiting
- background job queue
- retry/backoff state
- short-lived coordination/locks

The durable source of truth for learner state remains PostgreSQL. Redis must never become the canonical store for mastery, attempts, curriculum progress or content lineage.

## 10. Rate limiting

Production API rate limiting is required before public launch.

Priority limits:

- login/register attempts
- password/session endpoints
- AI endpoints
- Quick Lab challenge generation/submission
- admin content upload/process endpoints
- cron endpoints

Rate limits must be distributed across instances; therefore an in-memory limiter is not sufficient for the production topology. Redis-backed limiting is the intended implementation.

## 11. Content ingestion production boundary

The existing pipeline is already persistent and review-driven.

Production boundary:

```text
Upload
 -> object storage
 -> processing batch
 -> processing jobs
 -> worker
 -> extraction
 -> AI classification
 -> deterministic validation
 -> duplicate/lineage checks
 -> READY_FOR_REVIEW
 -> admin review
 -> publish
```

No AI-generated content should bypass deterministic validation or human approval when publishing into the learner-visible bank.

## 12. Observability

Required production signals:

### Application
- request latency
- 4xx/5xx rate
- route-level failures
- authentication failures
- job failures
- AI provider failures

### Learning
- question-attempt failures
- adaptive decision failures
- intervention failures
- test generation failures

### Infrastructure
- DB connection saturation
- DB latency
- queue depth
- worker failures/retries
- object-storage failures
- cron execution failures

Logs must not contain passwords, session tokens, access tokens, private keys or raw learner secrets.

## 13. Backup and disaster recovery

Production PostgreSQL requires:

- automated daily backups at minimum
- point-in-time recovery where available
- documented restore procedure
- restore verification in staging
- retention policy

Object storage requires:

- versioning where appropriate
- lifecycle/retention policy
- recovery procedure

A backup that has never been restored is not considered a verified backup.

## 14. CI/CD release gate

The deployment pipeline is:

```text
Git push
  -> GitHub Actions
  -> npm ci
  -> unit tests
  -> content validation
  -> production build
  -> PostgreSQL setup
  -> DB-backed smoke/integration tests
  -> staging deployment
  -> E2E
  -> production simulation
  -> production deployment
```

Vercel remains connected to GitHub for the web deployment, but a green CI result is a release requirement; GitHub/Vercel connectivity alone is not a production-quality gate.

## 15. Web / Android parity

Production configuration must preserve one API contract:

```text
Web ---------\
              -> HTTPS NOVA API -> PostgreSQL / services
Android ------/
```

Do not fork adaptive logic between Web and Android.

Android production must use an environment-specific HTTPS API base URL. The existing emulator development URL `http://10.0.2.2:3001/` remains development-only and must never be shipped as the production endpoint.

## 16. Phase 12 completion gates

Phase 12 is complete only when all of these are verified:

- [x] Central production environment validation
- [x] HTTPS production URL enforcement
- [x] Production secure session cookie
- [x] DB pool production controls
- [x] Health endpoint
- [x] Readiness endpoint
- [x] Security headers
- [x] Production env template
- [x] Persistent processing-job schema
- [ ] Managed production PostgreSQL
- [ ] Object storage integration
- [ ] Production worker/queue
- [ ] Distributed rate limiting
- [ ] Secrets manager/deployment secrets configured
- [ ] Structured production logging/error monitoring
- [ ] Backup + restore drill
- [ ] Production cron verification
- [ ] Staging environment
- [ ] Web production API configuration
- [ ] Android production API configuration
- [ ] CI green on the current main commit

Only after these are completed should Phase 13 begin as the full E2E release-validation phase.

## Implemented continuation — production boundary

### Object storage
Production content uploads now use the object-storage adapter in `src/lib/objectStorage.mjs`.
- Development can use local `storage/objects`.
- Production is forced to `OBJECT_STORAGE_MODE=s3` by runtime configuration validation.
- S3-compatible configuration supports bucket, region, endpoint and path-style options.
- Content-processing jobs persist the object key, byte size and SHA-256 source hash rather than relying on database blobs.
- The processing worker downloads the object when needed and removes it after successful processing.
- The database `source_data` column remains nullable for legacy compatibility.

### Durable content worker
The content API now only queues a persistent batch and returns HTTP 202. It no longer depends on Next.js `after()` execution for durable processing.
- `scripts/content-worker.mjs` polls PostgreSQL for jobs.
- Job claiming uses `FOR UPDATE SKIP LOCKED` so multiple workers cannot claim the same job concurrently.
- Stale PROCESSING jobs older than 10 minutes are eligible for recovery.
- Worker can run continuously or with `--once` for controlled execution.
- Production should run this worker as a separate process/container from the Next.js web process.

### Distributed rate limiting
`src/lib/rateLimit.mjs` provides a PostgreSQL-backed fixed-window limiter.
- It works across multiple web instances and does not depend on process memory.
- Login and registration are limited to 10 attempts/minute per source IP.
- Content processing is limited to 20 requests/minute per admin.
- Redis can replace this adapter later if throughput requires it; PostgreSQL remains the canonical state store.
- Migration V44 creates the shared rate-limit bucket table.

### New production configuration
`.env.production.example` now includes:
- `OBJECT_STORAGE_MODE=s3`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`
- `CONTENT_WORKER_POLL_MS`

### Release boundary
A production deployment is not complete merely because the web process starts. The release must include the web process, managed PostgreSQL, private object storage and the durable content worker. The worker is intentionally separated from the HTTP request lifecycle.
