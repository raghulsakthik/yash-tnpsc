-- Phase 17: Streak + Milestone Engine. Once unlocked, a milestone stays
-- unlocked forever — a 7-day streak that later breaks shouldn't un-award
-- the badge. One row per learner per milestone, ever.
--
-- Named milestone_achievement, not achievement: main's own
-- V10__achievements_and_push_tokens migration already owns a real,
-- populated `achievement` table (a display catalog: name/description/icon,
-- joined through `learner_achievement`) for a different, already-shipped
-- feature. This table is a per-learner milestone *event log*
-- (milestone_type + achieved_at + evidence metadata), a different shape
-- for a different purpose — kept distinct rather than colliding with or
-- rewriting main's real, working table.
CREATE TABLE milestone_achievement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  milestone_type  TEXT NOT NULL,
  achieved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}',
  UNIQUE (learner_id, milestone_type)
);

CREATE INDEX milestone_achievement_learner_idx ON milestone_achievement (learner_id, achieved_at DESC);
