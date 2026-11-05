# Phase 32 — Platform-Wide Learner API Identity

## Scope

Removed the shared `LEARNER_ID` from all 21 remaining API route handlers that were still using it. Every route now resolves the authenticated student through `requireLearner()` before accessing learner-owned data or accepting a learner write.

## Secured route families

- Default foundation assessment eligibility, creation and submission.
- Adaptive test creation and submission.
- Game session creation and submission.
- Learning session creation.
- Milestone listing and evaluation.
- PYQ selection, performance, catalogue listing and PYQ attempt submission.
- AI tutor, personalized AI context, AI evaluation, AI feedback loop and AI readiness explanation.
- Legacy analytics and exam-readiness endpoints.

## Security behavior

- Unauthenticated requests receive HTTP 401.
- Admin, super-admin, reviewer, subject-expert and other non-student sessions receive HTTP 401.
- Authenticated student requests pass their own session user ID to services.
- Attempt records, events, test submissions, game submissions, AI context and learner summaries no longer use the shared demo learner.
- Existing service validation and business rules remain in place; this phase changes the identity boundary, not the underlying scoring algorithms.

## Integration coverage

The disposable-Postgres authenticated HTTP E2E now checks:
- Student success and admin denial for legacy learner read endpoints across adaptive plan, recommendations, milestones, PYQ performance, analytics, exam readiness, PYQ catalogue and personalized AI context.
- Admin denial before body processing for assessment, game, milestone, session, AI tutor, PYQ attempt and adaptive test write endpoints.
- Two separate student adaptive plans remain isolated, including weak-prerequisite remediation.

## Validation

- API route scan: zero remaining `LEARNER_ID` references in `src/app/api/**/route.js`.
- Changed route syntax checks: PASS.
- Focused learner/adaptive tests: 52 passed.
- Full root suite and Next.js production build: pending final local run after this change.
- Disposable-Postgres HTTP E2E: pending GitHub Actions after push.

## Release note

No schema migration was introduced. No production deployment or production learner-data mutation was performed.
