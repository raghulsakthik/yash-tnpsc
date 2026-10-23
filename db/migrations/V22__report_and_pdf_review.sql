-- Two P0 gaps from the content-intelligence spec:
--  1. PDF-uploaded questions were publishing directly (no review-queue
--     state), unlike template/AI-generated batches which already go
--     through content_review_batch. 'pdf' simply joins the existing
--     generation_source taxonomy instead of inventing a parallel one.
--  2. No report/support system existed at all -- a student hitting a wrong
--     answer or bad explanation had no way to flag it, and nothing
--     aggregated real signal (accuracy, report count) into a review
--     priority the way question_attempt already could support.

ALTER TABLE question DROP CONSTRAINT question_generation_source_ck;
ALTER TABLE question ADD CONSTRAINT question_generation_source_ck
    CHECK (generation_source IN ('manual', 'pyq', 'template', 'ai', 'pdf'));

CREATE TABLE content_report (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    learner_id      UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    resolution      TEXT,
    reviewed_by     UUID REFERENCES learner (id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT content_report_reason_ck CHECK (reason IN (
        'wrong_answer', 'wrong_explanation', 'unclear', 'multiple_correct',
        'no_correct_answer', 'outdated', 'typo', 'wrong_topic', 'duplicate', 'other'
    )),
    CONSTRAINT content_report_status_ck CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED'))
);

CREATE INDEX content_report_status_idx ON content_report (status, created_at DESC);
CREATE INDEX content_report_question_idx ON content_report (question_id);

-- One open report per learner per question -- resubmitting the report
-- button is a no-op while the earlier one is still PENDING, rather than
-- piling up duplicate rows from the same person.
CREATE UNIQUE INDEX content_report_open_unique_idx
    ON content_report (question_id, learner_id) WHERE status = 'PENDING';
