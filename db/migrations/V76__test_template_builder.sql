-- The Admin Portal's Test Builder assumes a richer "exam paper" model than
-- test_template originally had: a real duration, marking scheme (marks per
-- question, negative marking), passing threshold, a subject/test-type
-- label, a proctoring policy reference, and -- the biggest gap -- an
-- explicit hand-picked question list rather than only topic-weighted
-- random generation. No real proctoring_policy table exists yet (that's
-- the separate, still-mock Proctoring Hub section), so
-- proctoring_policy_id/name stay plain free text here, not a real FK.
--
-- test_template.active already covers the only two statuses the Test
-- Builder UI ever actually sets (DRAFT when false, PUBLISHED when true) --
-- the richer READY_FOR_REVIEW/APPROVED/ARCHIVED states in the frontend
-- type are never set by any button in the UI, so no new status column.

ALTER TABLE test_template
    ADD COLUMN IF NOT EXISTS subject_name TEXT,
    ADD COLUMN IF NOT EXISTS test_type TEXT,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 45,
    ADD COLUMN IF NOT EXISTS marks_per_question NUMERIC(5, 2) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS passing_threshold_percent NUMERIC(5, 2) NOT NULL DEFAULT 40,
    ADD COLUMN IF NOT EXISTS proctoring_policy_id TEXT,
    ADD COLUMN IF NOT EXISTS proctoring_policy_name TEXT,
    ADD CONSTRAINT test_template_duration_ck CHECK (duration_minutes > 0),
    ADD CONSTRAINT test_template_marks_ck CHECK (marks_per_question > 0),
    ADD CONSTRAINT test_template_negative_marks_ck CHECK (negative_marks >= 0),
    ADD CONSTRAINT test_template_passing_ck CHECK (passing_threshold_percent >= 0 AND passing_threshold_percent <= 100);

-- An explicit, hand-picked question list -- an alternative to
-- test_template_topic's topic-weighted random generation, not a
-- replacement for it: a template with rows here is served verbatim by
-- /api/tests (POST), in sort_order; a template with only test_template_topic
-- rows keeps generating fresh questions per attempt exactly as before.
CREATE TABLE test_template_question (
    template_id  UUID NOT NULL REFERENCES test_template (id) ON DELETE CASCADE,
    question_id  TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (template_id, question_id)
);
