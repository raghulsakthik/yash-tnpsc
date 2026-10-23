-- Real, admin-uploaded downloadable resources (syllabus PDFs, cheat
-- sheets) -- backed by real stored bytes (src/lib/objectStorage.mjs),
-- never a fabricated placeholder blob generated client-side.
CREATE TABLE resource_file (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT NOT NULL DEFAULT 'General',
    object_key    TEXT NOT NULL,
    content_type  TEXT NOT NULL,
    size_bytes    BIGINT NOT NULL,
    uploaded_by   UUID REFERENCES app_user(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX resource_file_created_idx ON resource_file(created_at DESC);
