-- Append-only audit trail for engine imports, reviews, publication and rollback.
CREATE TABLE IF NOT EXISTS content_engine_audit (
    id              BIGSERIAL PRIMARY KEY,
    publication_id  TEXT REFERENCES content_engine_publication(publication_id) ON DELETE SET NULL,
    topic_id        TEXT REFERENCES topic(id) ON DELETE SET NULL,
    content_id      TEXT,
    content_kind    TEXT CHECK (content_kind IS NULL OR content_kind IN ('lesson','mcq')),
    version_number  INTEGER,
    action          TEXT NOT NULL CHECK (action IN ('IMPORTED','APPROVED','REJECTED','ROLLED_BACK')),
    actor_id        UUID,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_engine_audit_topic_idx ON content_engine_audit(topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_engine_audit_publication_idx ON content_engine_audit(publication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_engine_audit_content_idx ON content_engine_audit(content_id, created_at DESC);
