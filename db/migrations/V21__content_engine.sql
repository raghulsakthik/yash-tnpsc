-- Content Intelligence & Generation: adds the metadata columns a real
-- question bank needs (subtopic/skills/quality score/generation source) and
-- a review queue for anything not yet trusted enough to auto-publish.
-- Deliberately additive -- every existing row gets sane defaults and every
-- existing query keeps working untouched.

ALTER TABLE question
    ADD COLUMN subtopic         TEXT,
    ADD COLUMN question_type    TEXT NOT NULL DEFAULT 'conceptual',
    ADD COLUMN skills_required  JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN shortcut         TEXT,
    ADD COLUMN common_mistake   TEXT,
    ADD COLUMN quality_score    NUMERIC(4, 3),
    ADD COLUMN generation_source TEXT NOT NULL DEFAULT 'manual',
    ADD CONSTRAINT question_question_type_ck
        CHECK (question_type IN ('conceptual', 'calculation', 'application', 'recall')),
    ADD CONSTRAINT question_generation_source_ck
        CHECK (generation_source IN ('manual', 'pyq', 'template', 'ai')),
    ADD CONSTRAINT question_quality_score_ck
        CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1));

CREATE INDEX question_subtopic_idx ON question (topic_id, subtopic) WHERE subtopic IS NOT NULL;

-- Richer lesson content -- definition/formulas/shortcuts/common mistakes
-- alongside the worked example lesson.mjs already has. Arrays, since a
-- concept commonly has more than one formula or shortcut worth keeping.
ALTER TABLE lesson
    ADD COLUMN definition      TEXT,
    ADD COLUMN formulas        JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN shortcuts       JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN common_mistakes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Human review queue -- a generated batch lands here first; an admin
-- approves (publishes the linked questions) or rejects (archives them) a
-- whole batch at once instead of question-by-question.
CREATE TABLE content_review_batch (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    generation_source TEXT NOT NULL,
    question_ids    JSONB NOT NULL,   -- array of question.id
    avg_quality_score NUMERIC(4, 3),
    status          TEXT NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,
    CONSTRAINT content_review_batch_status_ck CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX content_review_batch_status_idx ON content_review_batch (status, created_at DESC);
