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
