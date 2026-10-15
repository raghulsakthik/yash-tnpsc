-- Quick Lab: timed-game rounds over the existing question bank. Each
-- question still writes its own question_attempt row via the shared
-- recordAttempt pipeline (mode 'QUICK_LAB') — this table only holds the
-- round-level aggregates (combo, totals) that are specific to the timed
-- framing and don't belong on that shared ledger.

CREATE TABLE quick_lab_session (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id     UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    mode           TEXT NOT NULL,            -- 'percentage-rush' | 'fraction-lab'
    topic_id       TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    status         TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    question_count INTEGER NOT NULL DEFAULT 0,
    correct_count  INTEGER NOT NULL DEFAULT 0,
    current_combo  INTEGER NOT NULL DEFAULT 0,
    best_combo     INTEGER NOT NULL DEFAULT 0,
    total_time_ms  BIGINT NOT NULL DEFAULT 0,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,
    CONSTRAINT quick_lab_session_status_ck CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

CREATE INDEX quick_lab_session_learner_mode_idx ON quick_lab_session (learner_id, mode, started_at DESC);
