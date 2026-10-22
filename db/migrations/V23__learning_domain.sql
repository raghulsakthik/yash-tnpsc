-- Phase 2: establish the generic backend domain model.
-- Additive only — no existing table is altered in a breaking way, no existing
-- column is dropped or renamed, no existing query's column list changes shape.

-- Generic content envelope. `question` keeps its own table (it already works,
-- is fully seeded, and is covered by 50+ tests) — `content_id` below is an
-- optional forward-looking link, not a migration of existing question rows.
-- Phase 3 is where the full content-type lifecycle (Lesson/Example/Question/
-- PYQ/Formula/CommonMistake) gets built out; this table only needs to carry
-- LESSON for Phase 2's exit test, and is extended with a wider type CHECK
-- later rather than redesigned.
CREATE TABLE content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('LESSON', 'QUESTION')),
  topic_id      TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  difficulty    NUMERIC(3,2) NULL CHECK (difficulty IS NULL OR difficulty BETWEEN 0 AND 1),
  status        TEXT NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT', 'VALIDATING', 'REVIEWED', 'PUBLISHED', 'ARCHIVED')),
  content_version INT NOT NULL DEFAULT 1,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX content_topic_status_idx ON content (topic_id, status);

-- A lesson is a content item with instructional body text. 1:1 extension of
-- `content` (content.type = 'LESSON' for every row here) rather than a
-- parallel, disconnected table.
--
-- Named content_lesson, not lesson: main's own V15__lesson migration (a
-- later, unrelated commit on this shared history) already owns a real,
-- populated `lesson` table (admin-editable, topic_id-keyed, replacing a
-- hardcoded content module) for an already-shipped feature. This table
-- was never seeded by anything (see docs/phase-3-completion.md and
-- phase-29's own audit) — kept distinct rather than colliding with or
-- rewriting main's real, working table.
CREATE TABLE content_lesson (
  content_id  UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL
);

-- Generic assessment concept (blueprint/instance). Deliberately separate from
-- the existing `test`/`test_question`/`test_answer` tables (V5), which
-- already implement the one specific assessment type the app has shipped
-- (the proportional weekly aptitude+reasoning test) and are not touched here.
-- This table is the forward-looking shape for the assessment types Phase 9+
-- will add (DEFAULT_TEST / DIAGNOSTIC / MINI_ASSESSMENT); WEEKLY_TEST is
-- listed so the two concepts can be reconciled later without a schema change,
-- but no code writes WEEKLY_TEST rows here yet — `/api/tests` is unaffected.
CREATE TABLE assessment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  UUID NULL REFERENCES learner(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('DEFAULT_TEST', 'DIAGNOSTIC', 'MINI_ASSESSMENT', 'WEEKLY_TEST')),
  status      TEXT NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assessment_learner_status_idx ON assessment (learner_id, status);

-- A bounded span of learner activity (one lesson, one practice run, one
-- revision run, one test). Individual `question_attempt` rows can optionally
-- point back at the session that produced them (see the nullable column
-- added below) without requiring every existing attempt-writing code path to
-- supply one.
CREATE TABLE learning_session (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id    UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  topic_id      TEXT NULL REFERENCES topic(id) ON DELETE SET NULL,
  session_type  TEXT NOT NULL CHECK (session_type IN ('LESSON', 'PRACTICE', 'REVISION', 'TEST', 'ASSESSMENT')),
  status        TEXT NOT NULL DEFAULT 'IN_PROGRESS'
                  CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX learning_session_learner_started_idx ON learning_session (learner_id, started_at DESC);

-- Forward-looking, additive links only. Both nullable: every existing insert
-- into `question_attempt` and `question` continues to work unchanged.
ALTER TABLE question_attempt
  ADD COLUMN session_id UUID NULL REFERENCES learning_session(id) ON DELETE SET NULL;

ALTER TABLE question
  ADD COLUMN content_id UUID NULL REFERENCES content(id) ON DELETE SET NULL;
