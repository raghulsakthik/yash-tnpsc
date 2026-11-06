# Phase 33 — Actionable Adaptive Roadmap

## Objective

Turn the adaptive roadmap from a read-only recommendation list into an executable learner workflow. Every roadmap step now opens the appropriate existing activity instead of creating a disconnected second learning engine.

## Delivered

- Added a `Start step` action to each roadmap item.
- Routed lesson and prerequisite-lesson actions to the exact syllabus topic in the structured lesson player, opening directly on Learn.
- Routed practice, timed-practice and reassessment actions to the exact topic's published-question queue, opening directly on Practice.
- Routed mini-assessment actions to the topic's PYQ assessment tab.
- Routed Memory Echo and Revision actions to a topic-filtered, learner-specific due revision question, submitting attempts with `mode=REVISION` so the spaced-repetition schedule advances.
- Extended `GET /api/revision/next?topic=<topicId>` to filter the authenticated learner's due schedule to the requested topic and only rows with `status='SCHEDULED'`. Existing unfiltered Revision view behavior is preserved.
- Updated both desktop and Android Journey screens to use the same launch contract and shared adaptive launch state.
- Android's adaptive launch delegates to the backend-backed shared lesson player; normal Android course navigation remains on its existing presentation.
- If a roadmap topic is absent from the structured course response, the UI falls back to topic-specific practice rather than opening an unrelated lesson.
- After a practice or PYQ answer is submitted, the learner's adaptive roadmap is refreshed from the backend. The UI does not mark mastery merely because a lesson screen was opened or completed locally.
- Added disposable-Postgres authenticated HTTP E2E coverage proving that a requested due revision topic is returned to its owner and is not visible to a second learner.

## Validation

- Root Node suite: 410 passed, 0 failed.
- nova-ui TypeScript check: PASS.
- Desktop Vite production build: PASS.
- Android Vite production build: PASS.
- Next.js production build: PASS (46 static pages).
- Revision route and E2E script syntax checks: PASS.
- `git diff --check`: PASS.
- Disposable-Postgres revision ownership E2E: queued for GitHub Actions after push.

## Notes

- Existing Vite chunk-size and `configLoader: native` warnings remain non-blocking.
- Existing Next.js middleware deprecation warning remains non-blocking.
- A topic with no published practice question or no revision currently due displays an honest empty state; no placeholder MCQs are fabricated in the adaptive launch path.
- No production deployment or production learner-data mutation was performed.
