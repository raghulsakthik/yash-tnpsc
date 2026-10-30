# Phase 25 — Authenticated Content Engine HTTP E2E

## Purpose

Exercise the real Next.js content-engine import route against a disposable PostgreSQL database. This is deliberately stronger than importing the route module directly: the test starts the application, authenticates through the real session-cookie boundary, sends HTTP requests, and inspects the resulting database state.

## Covered

- real `POST /api/admin/content-engine/import`
- authenticated super-admin session
- valid lesson + MCQ publication
- manifest hashing and canonicalization
- publication replay rejection
- tampered manifest rejection
- missing provenance rejection
- unauthenticated request rejection
- staging remains pending after import
- cleanup of the disposable fixture

## CI environment

GitHub Actions provisions PostgreSQL 16 as a service, applies all migrations, validates content, seeds the disposable database, and runs `scripts/content-engine-http-e2e.mjs`.

No production credentials, learner data, or external services are used.

## Security boundary

The engine is still expected to reject PYQs before publication. The platform integration test should eventually add a defense-in-depth PYQ marker at the API boundary as well; the current HTTP harness does not claim that check is implemented.

## Not covered yet

- real admin UI approval/rejection through a browser
- subject-expert scope denial using a scoped admin account
- learner-facing rendering after approval
- full publication lineage preservation after approval
- production database connectivity

Those are intentionally separate gates so a failure identifies the exact boundary that broke.
