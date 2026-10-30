-- Immutable engine lesson versions. The live lesson row remains the learner-facing
-- pointer while every approved engine publication is retained as a rollback target.

CREATE TABLE IF NOT EXISTS content_engine_lesson_version (
    id                  BIGSERIAL PRIMARY KEY,
    topic_id            TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    publication_id      TEXT NOT NULL REFERENCES content_engine_publication(publication_id) ON DELETE CASCADE,
    content_id          TEXT NOT NULL,
    version_number      INTEGER NOT NULL,
    title               TEXT NOT NULL,
    concept             TEXT NOT NULL,
    definition          TEXT,
    explanation         TEXT,
    examples            JSONB NOT NULL DEFAULT '[]'::jsonb,
    revision_notes      JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,
    engine_version      INTEGER,
    review_batch_id     TEXT,
    status              TEXT NOT NULL DEFAULT 'PUBLISHED',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at        TIMESTAMPTZ,
    superseded_at       TIMESTAMPTZ,
    rolled_back_at      TIMESTAMPTZ,
    reviewed_by         UUID,
    CONSTRAINT content_engine_lesson_version_status_ck
      CHECK (status IN ('PUBLISHED','SUPERSEDED','ROLLED_BACK')),
    CONSTRAINT content_engine_lesson_version_number_ck CHECK (version_number > 0),
    UNIQUE (topic_id, version_number),
    UNIQUE (publication_id, content_id)
);

CREATE INDEX IF NOT EXISTS content_engine_lesson_version_topic_idx
  ON content_engine_lesson_version(topic_id, version_number DESC);

ALTER TABLE content_engine_lineage
  ADD COLUMN IF NOT EXISTS version_number INTEGER;

CREATE INDEX IF NOT EXISTS content_engine_lineage_topic_version_idx
  ON content_engine_lineage(topic_id, version_number DESC);
