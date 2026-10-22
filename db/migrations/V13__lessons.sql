-- Lesson content, admin-editable. Replaces the hardcoded LESSONS object in
-- src/domain/lessons.mjs as the source of truth (that file's content is
-- ported in via scripts/seed-lessons.mjs so nothing already written is lost).

CREATE TABLE lesson (
    topic_id        TEXT PRIMARY KEY REFERENCES topic (id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    concept         TEXT NOT NULL,
    example_problem TEXT NOT NULL,
    example_steps   JSONB NOT NULL,   -- array of strings
    example_answer  TEXT NOT NULL,
    tip             TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


ALTER TABLE lesson ADD COLUMN definition TEXT, ADD COLUMN formulas JSONB NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN shortcuts JSONB NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN common_mistakes JSONB NOT NULL DEFAULT '[]'::jsonb;
