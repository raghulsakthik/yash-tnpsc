-- Phase 14: Intervention Tracking. Every adaptive recommendation treated as
-- an experiment — a baseline snapshot at the moment it's made, and (later)
-- a post snapshot so the system can answer "did this actually work?"
-- Additive only: no existing table changes.

CREATE TABLE intervention (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id          UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  topic_id            TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  intervention_type   TEXT NOT NULL, -- one of AdaptiveAction (Phase 11), e.g. 'REPEAT_LESSON'
  baseline_score      NUMERIC(4,3) NOT NULL,
  baseline_retention  NUMERIC(4,3) NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_spent_ms       BIGINT NULL,
  post_score          NUMERIC(4,3) NULL,
  post_retention      NUMERIC(4,3) NULL,
  learning_gain       NUMERIC(5,3) NULL,
  retention_gain      NUMERIC(5,3) NULL,
  status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EVALUATED', 'ABANDONED')),
  evaluated_at        TIMESTAMPTZ NULL
);

CREATE INDEX intervention_learner_topic_idx ON intervention (learner_id, topic_id, status);
CREATE INDEX intervention_learner_started_idx ON intervention (learner_id, started_at DESC);
