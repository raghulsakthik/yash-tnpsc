-- Spaced-repetition schedule. One row per learner+topic, created on a
-- topic's first attempt and advanced by src/domain/revision.mjs whenever a
-- REVISION-mode attempt is recorded.

CREATE TABLE revision_schedule (
    learner_id     UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    topic_id       TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    scheduled_at   TIMESTAMPTZ NOT NULL,
    interval_days  NUMERIC(5, 2) NOT NULL DEFAULT 1,
    status         TEXT NOT NULL DEFAULT 'SCHEDULED',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (learner_id, topic_id),
    CONSTRAINT revision_schedule_interval_ck CHECK (interval_days >= 1 AND interval_days <= 90),
    CONSTRAINT revision_schedule_status_ck CHECK (status IN ('SCHEDULED', 'DONE'))
);

CREATE INDEX revision_schedule_due_idx ON revision_schedule (learner_id, scheduled_at);
