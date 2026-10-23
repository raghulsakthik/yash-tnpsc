# Database

Phase 1 audit. Scope: database configuration, every entity, migration/seed mechanics. Verified by actually running migrations against a live Postgres instance (see `existing-functionality.md`).

## Configuration

- **Engine**: Postgres (pinned to `postgres:16` in `docker-compose.yml` for local dev; this audit ran migrations successfully against a locally-installed Postgres 18 as well — the schema has no version-specific features beyond standard SQL/JSONB/gen_random_uuid()).
- **Connection**: single env var `DATABASE_URL` (`postgresql://nova:nova@localhost:5432/nova` by default, see `.env.example`), read by `src/lib/db.mjs` into one `pg.Pool`.
- **Local dev**: `docker-compose.yml` defines one `db` service (`POSTGRES_USER/PASSWORD/DB=nova`, port 5432, healthcheck via `pg_isready`, named volume `nova-pgdata`). No app container — Next.js runs on the host via `npm run dev`.
- **CI**: `.github/workflows/ci.yml` uses a `postgres:16` service container with the same credentials.
- **Migration tracking**: a `schema_migration(version PK, applied_at)` table, created on first run by `scripts/migrate.mjs` if missing.
- **Other env vars**: `NOVA_LEARNER_ID` (overrides the hard-coded single-learner UUID), `NOVA_LEARNER_NAME`, `NOVA_LANGUAGE` (`ta`/`en`, decides which content `seed.mjs` loads), `ANTHROPIC_API_KEY` (optional, enables AI hints).

## Entities (V1__init.sql — base schema)

| Table | Columns | Constraints / Indexes |
|---|---|---|
| `learner` | `id UUID PK`, `name`, `created_at`, `updated_at` | — |
| `learner_profile` | `learner_id PK/FK→learner`, `exam` (default `tnpsc-prelims-495`), `language` (default `en`), `daily_goal_minutes` (default 30), `updated_at` | CHECK language IN ('ta','en') |
| `subject` | `id TEXT PK`, `name`, `sort_order` | — |
| `chapter` | `id TEXT PK`, `subject_id FK`, `name`, `sort_order`, `question_count` (real official paper count — sole input to exam-weight) | — |
| `topic` | `id TEXT PK`, `chapter_id FK`, `name`, `sort_order` | — |
| `topic_prerequisite` | `topic_id`, `prerequisite_topic_id` (both FK→topic), `strength NUMERIC(3,2)` | PK(topic_id, prereq_id); CHECK strength (0,1]; CHECK no self-reference |
| `question` | `id TEXT PK`, `topic_id FK`, `language`, `prompt`, `options JSONB`, `answer_index INT`, `explanation`, `trap TEXT NULL`, `difficulty NUMERIC(3,2)`, `estimated_seconds` (default 60), `source` (default `authored`), `source_year INT NULL` (**declared, never populated** — see `architecture.md` §Incomplete functionality), `status` (default `PUBLISHED`), `normalized_hash`, timestamps | CHECK language, difficulty [0,1], answer_index≥0, status IN (DRAFT/REVIEWED/PUBLISHED/ARCHIVED); INDEX (topic_id, language, difficulty) WHERE status='PUBLISHED'; UNIQUE (language, normalized_hash) |
| `question_attempt` | `id UUID PK` (client-supplied idempotency key), `learner_id FK`, `question_id FK`, `topic_id FK`, `selected_index INT NULL`, `correct BOOLEAN`, `time_taken_ms`, `confidence INT NULL` (1–5), `mistake_type TEXT NULL`, `created_at` | CHECK confidence NULL or 1–5; INDEX (learner_id, topic_id, created_at DESC) |
| `learner_topic_state` | `learner_id`, `topic_id` (FK), `accuracy_score`, `speed_score`, `current_difficulty` (default 0.30), `attempt_count`, `correct_count`, `consecutive_wrong`, `next_action` (default PRACTICE), `last_studied_at`, `updated_at` | PK(learner_id, topic_id); CHECK difficulty [0,1] |
| `learning_event` | `id BIGSERIAL PK`, `learner_id FK`, `event`, `topic_id TEXT NULL`, `metadata JSONB`, `created_at` | INDEX (learner_id, created_at DESC); append-only, write-only in practice |

### V2__mastery_dimensions.sql

Adds to `learner_topic_state`: `concept_score`, `consistency_score`, `confidence_score`, `retention_score`, `mastery_score` (all `NUMERIC(4,3) NOT NULL DEFAULT 0`).

### V3__revision_schedule.sql

New table `revision_schedule`: `learner_id`, `topic_id` (FK, PK together), `scheduled_at`, `interval_days` (default 1), `status` (default SCHEDULED), `updated_at`. CHECK interval_days [1,90]; CHECK status IN (SCHEDULED, DONE); INDEX (learner_id, scheduled_at).

### V4__ai_interaction.sql

New table `ai_interaction`: `id BIGSERIAL PK`, `learner_id FK`, `topic_id FK`, `question_id FK`, `type`, `prompt_context JSONB`, `response`, `model`, `created_at`. CHECK type IN ('HINT','EXPLANATION'); UNIQUE (question_id, type) — log and cache key in one.

### V5__weekly_tests.sql

- `test`: `id UUID PK`, `learner_id FK`, `status` (default IN_PROGRESS), `question_count`, `started_at`, `completed_at TIMESTAMPTZ NULL`, `score NUMERIC(5,2) NULL`, `created_at`. CHECK status IN (IN_PROGRESS, COMPLETED); INDEX (learner_id, created_at DESC).
- `test_question`: `test_id FK`, `question_id FK`, `order_index`. PK(test_id, question_id).
- `test_answer`: `test_id FK`, `question_id FK`, `selected_index INT NULL`, `marked_for_review` (default false), `time_taken_ms NULL`, `answered_at` (default now()). PK(test_id, question_id). No correctness column — graded once at submit via `recordAttempt`, writing to `question_attempt` as single source of truth.

## Migration & seed mechanics — verified by running them

```
npm run db:migrate   → applied V1..V5 cleanly against a fresh database (0 errors)
npm run validate:content → 40 topics, 322 questions validated, 0 errors
npm run db:seed       → seeded 3 subjects, 16 chapters, 40 topics, 15 prerequisite edges, 322 questions
```

`scripts/migrate.mjs` (~65 lines): applies any `db/migrations/*.sql` not yet in `schema_migration`, sorted by `V<n>__` prefix, each inside its own transaction, rolling back and exiting non-zero on first failure.

`scripts/seed.mjs`: idempotent; reads `content/syllabus/*.yaml` + `content/questions/**/*.yaml`; upserts `learner`/`learner_profile` (hard-coded `LEARNER_ID`), then `subject → chapter → topic → topic_prerequisite`, then `question` rows (hash = SHA-256 of normalized prompt, used for `normalized_hash` dedup). One transaction, rolled back entirely on any failure. Only one language seeded per run (`NOVA_LANGUAGE`).

## Notes for future schema work

- No `user`/credential table — `learner`/`learner_profile` are identity placeholders only.
- Every per-learner table is already keyed by `learner_id` FK — multi-tenant isolation at the schema level is mostly in place; what's missing is identity resolution at the request layer (see `architecture.md` §Authentication), not schema redesign.
- `question.source_year` exists but is unpopulated even though 137/322 questions carry a real PYQ year embedded in the `source` string (see `content.md`).
