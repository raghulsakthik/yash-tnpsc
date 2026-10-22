-- Admin-uploaded study resources (lesson/explanation prose) per topic.
-- Separate from the hand-authored LESSONS object in src/domain/lessons.mjs --
-- that file stays as the curated baseline; rows here are additional
-- material grown by the admin bulk-upload pipeline, shown alongside it.

CREATE TABLE topic_resource (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id    TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'admin-upload',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX topic_resource_topic_idx ON topic_resource (topic_id, created_at DESC);
