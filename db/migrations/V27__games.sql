-- Phase 22: Subject-Specific Game Engine. One engine, many configurations —
-- a "speed round" over a mathematics topic and one over a reasoning topic
-- are the same mechanics with different config (GameDefinition), not two
-- systems. Additive only: no existing table changes.
--
-- Schema only — the two real, illustrative game_definition rows (resolved
-- from the real topic/chapter tables, never hardcoded) are seeded by
-- scripts/seed.mjs instead of here: migrate runs before seed
-- (npm run setup), so a migration-time INSERT depending on real topic
-- rows would be inserting against an empty table on a fresh database.

CREATE TABLE game_definition (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  target_topic_ids    TEXT[] NOT NULL, -- resolved once at seed time, not re-derived per session
  difficulty_floor    NUMERIC(3,2) NOT NULL DEFAULT 0,
  difficulty_ceiling  NUMERIC(3,2) NOT NULL DEFAULT 1,
  question_count      INT NOT NULL DEFAULT 10,
  time_limit_seconds  INT NOT NULL DEFAULT 120,
  scoring_config      JSONB NOT NULL DEFAULT '{}',
  mechanics           TEXT NOT NULL DEFAULT 'SPEED_ROUND',
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game_session (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_definition_id  TEXT NOT NULL REFERENCES game_definition(id),
  learner_id          UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ NULL,
  total_score         NUMERIC(8,2) NULL
);

CREATE INDEX game_session_learner_idx ON game_session (learner_id, game_definition_id, status);

CREATE TABLE game_question (
  game_session_id UUID NOT NULL REFERENCES game_session(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  order_index     INT NOT NULL,
  PRIMARY KEY (game_session_id, question_id)
);

CREATE TABLE game_attempt (
  game_session_id UUID NOT NULL REFERENCES game_session(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  selected_index  INT NULL,
  time_taken_ms   INT NULL,
  correct         BOOLEAN NULL,
  points_awarded  NUMERIC(6,2) NULL,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_session_id, question_id)
);

-- Phase 25: pure content, zero new code — the same precedent Phase 20 set
-- for proving the content pipeline is subject-agnostic, now applied to
-- Phase 22's existing, unchanged game engine. "Constitution Match" is one
-- of the named subject-specific games in the consolidated 25-29 brief.
--
-- No schema change here — the real game_definition row itself (its real
-- target_topic_ids resolved from the real gs.indian-polity chapter,
-- Phase 20's 11 real, authored questions) is seeded by scripts/seed.mjs
-- alongside V24's two, for the same reason: migrate runs before seed.
