-- Phase 28.3: Exam Readiness Engine. The index itself is always recomputed
-- fresh from live evidence (never stored as the source of truth) — this
-- table exists for exactly one reason: "the system should also explain why
-- the score changed" needs a real previous score to diff against, not a
-- guessed one.
CREATE TABLE readiness_snapshot (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id    UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL,
  breakdown     JSONB NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX readiness_snapshot_learner_idx ON readiness_snapshot (learner_id, computed_at DESC);
