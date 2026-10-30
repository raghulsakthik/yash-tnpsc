-- Content Intelligence Engine -> platform publication boundary.
-- Approved engine output lands in staging and remains non-served until the
-- existing admin review batch is approved.

ALTER TABLE content_review_batch
    ADD COLUMN IF NOT EXISTS lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS content_engine_lesson_staging (
    id                  TEXT PRIMARY KEY,
    topic_id            TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    concept             TEXT NOT NULL,
    definition          TEXT,
    explanation         TEXT,
    examples            JSONB NOT NULL DEFAULT '[]'::jsonb,
    revision_notes      JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,
    engine_version      INTEGER NOT NULL DEFAULT 1,
    publication_id      TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID,
    CONSTRAINT content_engine_lesson_staging_status_ck
      CHECK (status IN ('PENDING','PUBLISHED','REJECTED'))
);

CREATE INDEX IF NOT EXISTS content_engine_lesson_staging_topic_idx
  ON content_engine_lesson_staging(topic_id, status);

CREATE TABLE IF NOT EXISTS content_engine_publication (
    publication_id      TEXT PRIMARY KEY,
    manifest_hash       TEXT NOT NULL,
    item_count          INTEGER NOT NULL,
    status              TEXT NOT NULL DEFAULT 'IMPORTED',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID,
    CONSTRAINT content_engine_publication_status_ck
      CHECK (status IN ('IMPORTED','APPROVED','REJECTED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS content_engine_publication_manifest_idx
  ON content_engine_publication(manifest_hash);
