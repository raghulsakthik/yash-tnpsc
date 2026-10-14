-- Weekly test: a 25-question, exam-proportional test. Correctness is
-- deliberately not stored on test_answer — it's computed once at submit
-- time and written to question_attempt via the shared recordAttempt, so
-- there is one source of truth for "was this answer right," not two that
-- could drift.

CREATE TABLE test (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id     UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    status         TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    question_count INTEGER NOT NULL,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,
    score          NUMERIC(5, 2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT test_status_ck CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

CREATE INDEX test_learner_idx ON test (learner_id, created_at DESC);

CREATE TABLE test_question (
    test_id     UUID NOT NULL REFERENCES test (id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

CREATE TABLE test_answer (
    test_id           UUID NOT NULL REFERENCES test (id) ON DELETE CASCADE,
    question_id       TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    selected_index    INTEGER,
    marked_for_review BOOLEAN NOT NULL DEFAULT false,
    time_taken_ms     INTEGER,
    answered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (test_id, question_id)
);
