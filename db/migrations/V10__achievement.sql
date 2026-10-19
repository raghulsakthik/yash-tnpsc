-- Phase 17: Streak + Milestone Engine. Once unlocked, an achievement stays
-- unlocked forever — a 7-day streak that later breaks shouldn't un-award
-- the badge. One row per learner per milestone, ever.
-- Additive only: no existing table changes.

CREATE TABLE achievement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  milestone_type  TEXT NOT NULL,
  achieved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}',
  UNIQUE (learner_id, milestone_type)
);

CREATE INDEX achievement_learner_idx ON achievement (learner_id, achieved_at DESC);
