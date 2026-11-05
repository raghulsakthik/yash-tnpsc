# Admin question bank — backend wiring

Date: 6 November 2026
Migration: V75

## What changed

The nova-ui Admin → Question Bank and Question Review sections now load questions from the platform database rather than browser-local mock data.

- Topic list is loaded from `GET /api/admin/topics`.
- Topic question list is loaded from `GET /api/admin/questions?topic=<topicId>`.
- Create, edit, review submission, publish and reject operations call the corresponding question API.
- The UI uses real syllabus topic IDs. Subject/chapter/topic labels come from the database; free-typed topic labels are no longer accepted.
- Attempt counts and accuracy are shown as unavailable (`—`) because this admin list query does not yet aggregate question-attempt analytics.
- Official PYQ provenance cannot be created or edited from the manual question form. PYQs must use the document ingestion path; existing imported PYQ provenance is displayed read-only.
- The question editor only changes the current question's content and status. It cannot move an existing question to a different topic.

## Status and permission rules

V75 expands the question status constraint to support the admin review workflow while retaining legacy `REVIEWED` rows:
- `DRAFT`
- `IN_REVIEW`
- `REVIEWED` (legacy)
- `PUBLISHED`
- `REJECTED`
- `ARCHIVED`

Server authorization is authoritative:
- Create draft: `QUESTION_CREATE`.
- Submit to review: `QUESTION_CREATE` + `REVIEW_QUESTION`.
- Publish on creation: `QUESTION_CREATE` + `QUESTION_PUBLISH`.
- Edit: `QUESTION_UPDATE`.
- Move to review/reject/reviewed: `QUESTION_UPDATE` + `REVIEW_QUESTION`.
- Publish an existing question: `QUESTION_UPDATE` + `QUESTION_PUBLISH`.
- Delete: `QUESTION_DELETE`.

The API rechecks topic subject scope for topic listing, question listing, editing, and status transitions. The UI no longer offers role simulation; backend authorization remains authoritative.

## Session role mapping

- `GET /api/auth/me` now returns the server-derived `adminRole` alongside the account role.
- Web and Android admin shells map the authenticated role to the corresponding UI role (platform/content admin/content reviewer/question-bank/subject-expert/question-reviewer/AI-quality/support/analytics/auditor).
- The client-side "Simulate Role" dropdown and localStorage role override have been removed. The visible role is read-only and mirrors the session.
- Unknown or unassigned admin roles show no privileged sections; a Super Admin must assign a role.
- UI navigation/action visibility is a usability layer only. Every sensitive API still performs server-side permission and subject-scope checks.

## Lesson workflow permission alignment

The lesson authoring routes are also protected against status escalation:
- Creating a lesson requires `CONTENT_CREATE`; editing requires `CONTENT_UPDATE`.
- A new lesson defaults to `DRAFT`; omitted status on an existing lesson preserves its current status.
- Submit to review (`IN_REVIEW`) requires `CONTENT_UPDATE`.
- Mark approved (`APPROVED`) requires `REVIEW_CONTENT`.
- Publish (`PUBLISHED`) requires `CONTENT_PUBLISH`.
- Archive requires `CONTENT_DELETE` through the status route; hard delete remains restricted to the same permission and is not exposed in the lesson UI.
- A content reviewer can approve an in-review lesson but cannot publish it. A subject expert can create/edit and submit but cannot approve or publish. A content admin/platform admin can perform the full workflow.
- The lessons list now filters topics using the current admin's subject scope; it no longer leaks all subjects to a subject expert.

## Safety and integrity

- New manual questions default to `DRAFT`; the backend no longer publishes them automatically.
- Options are trimmed, non-empty, and unique after normalization.
- The answer index must point to a valid option.
- PYQ fields are not accepted by the manual creation flow. Source-year, paper, question-number and page provenance must originate in the source-ingestion pipeline.
- Question publication requires the separate publish permission; the old PATCH route could update status with only update permission and is now restricted.
- No admin question mutations are claimed as audited in the immutable audit log yet. The Audit Logs section remains a design-preview/local-data surface until a persistent admin audit service is wired.

## Validation and rollout

- Root Node test suite: 407 passed, 0 failed.
- Next.js production build and TypeScript: PASS (46 static pages).
- nova-ui TypeScript check (`npm run lint`): PASS.
- nova-ui desktop Vite build: PASS.
- Android Vite build: PASS.
- Question and lesson workflow policy tests: 19 passed; AI lesson generator tests: 8 passed; migration version uniqueness: PASS.
- Content Engine hardening contract: PASS.
- V74 is now used by the main branch for learner suspension metadata; this branch's question review status migration is V75. Verify the production migration ledger before deployment; V75 is pending production rollout.
- Local PostgreSQL is unavailable in the current development environment. The GitHub disposable-Postgres review E2E now also exercises subject-expert subject scoping, cross-subject question denial, filtered lesson/topic-map lists, and AI-generation permission denial; the updated run is pending.
