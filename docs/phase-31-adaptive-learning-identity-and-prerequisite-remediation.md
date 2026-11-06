# Phase 31 — Adaptive Learning Identity & Prerequisite Remediation

## What changed

- Replaced the shared `LEARNER_ID` constant in the adaptive learning API family with the authenticated `STUDENT` session identity.
- Added `requireLearner()` and a pure learner-account guard. Admin, teacher, reviewer, missing-session, and malformed accounts cannot call learner-only adaptive APIs.
- Applied the identity boundary to adaptive plan, weekly plan, weekly assignment, progression tier, cross-subject decision, expanded next action, mastery gate, retention, completion status, test comparison, recommendation, intervention, learner summary, and the legacy v1 plan/next-action/recommendation/intervention reads.
- Tightened `requireLearnerId(request)` so all routes using this helper reject non-`STUDENT` accounts too, including the attempt submission pipeline.
- Preserved the existing adaptive decision engine and mastery model; no new schema or migration was required.
- Fixed prerequisite classification so a dependent topic can be blocked before the learner has attempted it when its prerequisite is weak or has no evidence.
- Ensured a `PREREQUISITE_BLOCKED` topic always selects prerequisite remediation, even when the separate prerequisite-risk metric is zero.
- Passed the actual weakest prerequisite through the adaptive decision context so the roadmap inserts the prerequisite's lesson/practice/reassessment steps instead of incorrectly reteaching the dependent topic.
- Enriched adaptive-plan steps with topic/subject/chapter labels, estimated minutes, classification, accuracy, mastery and prerequisite evidence; added per-topic insight summaries for the learner UI.
- Connected the same authenticated adaptive-plan API to the desktop and Android Journey screens through the shared useAppData hook. Both platforms now render the same ordered steps, estimated time, reasons, weak prerequisite signal and topic status.
- Extended the disposable-Postgres authenticated HTTP E2E with two student accounts: one with a weak prerequisite and one with a strong prerequisite. It checks that their plans differ, that roadmap metadata is complete, and that the first learner's weakness is never leaked into the second learner's plan.
- Added E2E checks that legacy adaptive, recommendation, learner summary, and intervention read routes reject admin sessions and accept student sessions; intervention creation is also denied to admins and allowed for the authenticated student.

## Validation

- Focused adaptive, diagnostic, roadmap and learner-access tests: 52 passed.
- Full root Node suite: 410 passed, 0 failed.
- Next.js production build and TypeScript: PASS (46 static pages).
- nova-ui TypeScript check, desktop Vite build and Android Vite build: PASS with the shared adaptive roadmap rendered in both Journey screens.
- Changed route syntax checks and `git diff --check`: PASS.
- Disposable-Postgres HTTP E2E: queued for GitHub Actions after push.

## Scope and known follow-up

- This phase secures the adaptive-learning and closely related recommendation/intervention API family. Other older non-adaptive endpoints still using the legacy shared `LEARNER_ID` need a separate, comprehensive route migration before claiming platform-wide learner data isolation.
- No production deployment or live learner data mutation was performed.
