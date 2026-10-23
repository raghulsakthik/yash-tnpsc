-- Persist the placement decision made from the learner's diagnostic.
-- This is separate from learner_topic_state so the original diagnostic
-- evidence remains auditable even as later practice changes mastery.
CREATE TABLE IF NOT EXISTS learner_placement (
    learner_id          UUID PRIMARY KEY REFERENCES learner(id) ON DELETE CASCADE,
    curriculum_id       TEXT NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    level               INTEGER NOT NULL DEFAULT 1,
    level_name          TEXT NOT NULL DEFAULT 'Foundation',
    score               NUMERIC(5,2) NOT NULL DEFAULT 0,
    answered_count      INTEGER NOT NULL DEFAULT 0,
    correct_count       INTEGER NOT NULL DEFAULT 0,
    topic_scores        JSONB NOT NULL DEFAULT '[]'::jsonb,
    subject_scores      JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_phase_id TEXT REFERENCES learning_phase(id) ON DELETE SET NULL,
    recommended_week_id  TEXT REFERENCES learning_week(id) ON DELETE SET NULL,
    reason              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learner_placement_phase_idx ON learner_placement(recommended_phase_id);
