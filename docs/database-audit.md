# Database Audit

Scope: `db/migrations/V1`–`V5`, `scripts/migrate.mjs`, `scripts/seed.mjs`. Factual inventory only.

## V1__init.sql — base schema

| Table | Columns | Constraints / Indexes |
|---|---|---|
| `learner` | `id UUID PK`, `name`, `created_at`, `updated_at` | — |
| `learner_profile` | `learner_id PK/FK→learner`, `exam` (default `tnpsc-prelims-495`), `language` (default `en`), `daily_goal_minutes` (default 30), `updated_at` | CHECK language IN ('ta','en') |
| `subject` | `id TEXT PK`, `name`, `sort_order` | — |
| `chapter` | `id TEXT PK`, `subject_id FK`, `name`, `sort_order`, `question_count` (real official paper count — sole input to exam-weight) | — |
| `topic` | `id TEXT PK`, `chapter_id FK`, `name`, `sort_order` | — |
| `topic_prerequisite` | `topic_id`, `prerequisite_topic_id` (both FK→topic), `strength NUMERIC(3,2)` | PK(topic_id, prereq_id); CHECK strength (0,1]; CHECK no self-reference |
| `question` | `id TEXT PK`, `topic_id FK`, `language`, `prompt`, `options JSONB`, `answer_index INT`, `explanation`, `trap TEXT NULL`, `difficulty NUMERIC(3,2)`, `estimated_seconds` (default 60), `source` (default `authored`), `source_year INT NULL`, `status` (default `PUBLISHED`), `normalized_hash`, timestamps | CHECK language, difficulty [0,1], answer_index≥0, status IN (DRAFT/REVIEWED/PUBLISHED/ARCHIVED); INDEX (topic_id, language, difficulty) WHERE status='PUBLISHED'; UNIQUE (language, normalized_hash) |
| `question_attempt` | `id UUID PK` (client-supplied idempotency key), `learner_id FK`, `question_id FK`, `topic_id FK`, `selected_index INT NULL`, `correct BOOLEAN`, `time_taken_ms`, `confidence INT NULL` (1–5), `mistake_type TEXT NULL`, `created_at` | CHECK confidence NULL or 1–5; INDEX (learner_id, topic_id, created_at DESC) |
| `learner_topic_state` | `learner_id`, `topic_id` (FK), `accuracy_score`, `speed_score`, `current_difficulty` (default 0.30), `attempt_count`, `correct_count`, `consecutive_wrong`, `next_action` (default PRACTICE), `last_studied_at`, `updated_at` | PK(learner_id, topic_id); CHECK difficulty [0,1] |
| `learning_event` | `id BIGSERIAL PK`, `learner_id FK`, `event`, `topic_id TEXT NULL`, `metadata JSONB`, `created_at` | INDEX (learner_id, created_at DESC); append-only, analytics-only, never read by the engine |

## V2__mastery_dimensions.sql

Adds to `learner_topic_state`: `concept_score`, `consistency_score`, `confidence_score`, `retention_score`, `mastery_score` (all `NUMERIC(4,3) NOT NULL DEFAULT 0`). Introduces the full 6-dimension mastery model computed in `mastery.mjs`.

## V3__revision_schedule.sql

New table `revision_schedule`: `learner_id`, `topic_id` (FK, PK together), `scheduled_at`, `interval_days` (default 1), `status` (default SCHEDULED), `updated_at`. CHECK interval_days [1,90]; CHECK status IN (SCHEDULED, DONE); INDEX (learner_id, scheduled_at) for due-lookups.

## V4__ai_interaction.sql

New table `ai_interaction`: `id BIGSERIAL PK`, `learner_id FK`, `topic_id FK`, `question_id FK`, `type`, `prompt_context JSONB`, `response`, `model`, `created_at`. CHECK type IN ('HINT','EXPLANATION'); UNIQUE (question_id, type) — doubles as log and cache key (one stored response per question+type, shared across learners).

## V5__weekly_tests.sql

- `test`: `id UUID PK`, `learner_id FK`, `status` (default IN_PROGRESS), `question_count`, `started_at`, `completed_at TIMESTAMPTZ NULL`, `score NUMERIC(5,2) NULL`, `created_at`. CHECK status IN (IN_PROGRESS, COMPLETED); INDEX (learner_id, created_at DESC).
- `test_question`: `test_id FK`, `question_id FK`, `order_index`. PK(test_id, question_id).
- `test_answer`: `test_id FK`, `question_id FK`, `selected_index INT NULL`, `marked_for_review` (default false), `time_taken_ms NULL`, `answered_at` (default now()). PK(test_id, question_id). Stores no correctness — graded once at submit via `recordAttempt`, writing to `question_attempt` as single source of truth.

## `scripts/migrate.mjs`

~65-line hand-rolled migrator (explicitly not a framework — "one learner, one database"). Tracks applied versions in a `schema_migration(version PK, applied_at)` table it creates if missing. Applies any unapplied `db/migrations/*.sql` file (sorted by `V<n>__` prefix) inside its own transaction, rolling back and exiting non-zero on first failure.

## `scripts/seed.mjs`

Idempotent: reads `content/syllabus/*.yaml` and `content/questions/**/*.yaml`, upserts `learner`/`learner_profile` (same hard-coded `LEARNER_ID`), then `subject → chapter → topic → topic_prerequisite` (edges skipped if either endpoint isn't seeded for the active language), then `question` rows (hash = SHA-256 of normalized prompt, used for `normalized_hash` dedup). All upserts in one transaction, rolled back entirely on failure. Only one language's content is seeded per run (`NOVA_LANGUAGE`, default `en`). `content/` is the source of truth; the DB is downstream and disposable.

## Notes for future schema work

- No `user`/credential table exists — `learner`/`learner_profile` are identity placeholders only (id, name, exam, language, daily_goal_minutes). See `architecture-audit.md` §Authentication.
- `question.source`/`source_year` already support PYQ tagging; `examRelevance()` in `selection.mjs` reads `source` (`tnpsc-*` scores highest) but no content currently uses anything but `source: authored` per the content audit — PYQ-tagged questions mentioned in recent commits are a separate, newer effort worth reconciling against this (see `implementation-gap.md`).
- Every table that is per-learner is already keyed by `learner_id` FK — multi-tenant isolation at the schema level is mostly in place; what's missing is identity resolution at the request layer, not schema redesign.
