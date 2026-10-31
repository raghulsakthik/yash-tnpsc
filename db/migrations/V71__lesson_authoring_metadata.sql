-- Admin Portal's Lessons section (the nova-ui one, not /admin/lessons) was
-- designed around a richer authoring model than `lesson` had: a
-- description, explicit learning objectives, a difficulty tag, an
-- estimated duration, free-form markdown content, and a draft/review/
-- publish workflow. Adding that for real rather than reconciling the UI
-- down to the narrower worked-example model /admin/lessons already uses --
-- both editors now share the same table, each touching the fields it
-- cares about; a lesson created via one is still visible/editable via the
-- other, just with the fields the other editor doesn't set left at their
-- defaults.
--
-- Every existing row is real, already-published content -- defaulting
-- status to PUBLISHED keeps it exactly as visible as it already is.
ALTER TABLE lesson
    ADD COLUMN description               TEXT NOT NULL DEFAULT '',
    ADD COLUMN learning_objectives        JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN difficulty                 TEXT NOT NULL DEFAULT 'Intermediate',
    ADD COLUMN estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN content_markdown           TEXT NOT NULL DEFAULT '',
    ADD COLUMN status                     TEXT NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN version                    INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN updated_by                 UUID,
    ADD CONSTRAINT lesson_difficulty_ck CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    ADD CONSTRAINT lesson_status_ck CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'));

-- The learner-facing lesson endpoint must filter on this or a DRAFT/
-- IN_REVIEW/ARCHIVED lesson an admin is actively editing would be served
-- to real students mid-edit. See src/app/api/lesson/[topic]/route.js.
CREATE INDEX lesson_status_idx ON lesson (status);
