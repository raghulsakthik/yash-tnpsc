-- Milestones: compute-on-read, persist-on-first-true. earned_at is "first
-- time this was observed true," not a reconstructed historical date —
-- nothing before this migration tracked achievement history.

CREATE TABLE learner_milestone (
    learner_id  UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    milestone_id TEXT NOT NULL,
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (learner_id, milestone_id)
);
