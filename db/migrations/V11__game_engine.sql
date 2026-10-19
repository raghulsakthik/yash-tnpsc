-- Phase 22: Subject-Specific Game Engine. One engine, many configurations —
-- a "speed round" over a mathematics topic and one over a reasoning topic
-- are the same mechanics with different config (GameDefinition), not two
-- systems. Additive only: no existing table changes.

CREATE TABLE game_definition (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  target_topic_ids    TEXT[] NOT NULL, -- resolved once at definition time, not re-derived per session
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

-- Two illustrative, real configurations over the real seeded syllabus —
-- topic lists resolved from the actual topic/chapter tables, not hardcoded,
-- so they stay correct if the syllabus changes.
INSERT INTO game_definition (id, name, target_topic_ids, difficulty_floor, difficulty_ceiling, question_count, time_limit_seconds, scoring_config, mechanics)
SELECT 'speed-round-aptitude', 'Aptitude Speed Round',
       (SELECT array_agg(id) FROM topic WHERE chapter_id = 'apt.aptitude'),
       0.1, 0.6, 10, 90,
       '{"pointsPerCorrect": 10, "speedBonusMax": 5, "streakBonusPerStreak": 2, "streakBonusCap": 10}'::jsonb,
       'SPEED_ROUND';

INSERT INTO game_definition (id, name, target_topic_ids, difficulty_floor, difficulty_ceiling, question_count, time_limit_seconds, scoring_config, mechanics)
SELECT 'speed-round-reasoning', 'Reasoning Speed Round',
       (SELECT array_agg(id) FROM topic WHERE chapter_id = 'apt.reasoning'),
       0, 0.5, 8, 75,
       '{"pointsPerCorrect": 10, "speedBonusMax": 5, "streakBonusPerStreak": 2, "streakBonusCap": 10}'::jsonb,
       'SPEED_ROUND';
