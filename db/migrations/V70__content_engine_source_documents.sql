-- Registry of immutable source material stored in Google Cloud Storage
-- (the shared bucket layer for the retrieval engine, the content-labelling
-- engine, and this platform -- see infra/gcs/provision.sh). The database
-- stays the system of record for metadata; GCS stays the system of record
-- for the actual bytes. content_engine_lineage.source_ids references
-- this table's id, so a lesson/MCQ can be traced back to the exact object
-- and page it came from.
--
-- A document is never overwritten: a re-upload of the same object name
-- gets a new row with a new generation, not a mutated existing row (see
-- the unique constraint below). Superseding an existing document is an
-- explicit status change, not a silent replace.

CREATE TABLE IF NOT EXISTS content_engine_source_document (
    id                  TEXT PRIMARY KEY,
    storage_provider    TEXT NOT NULL DEFAULT 'gcs',
    bucket              TEXT NOT NULL,
    object_name         TEXT NOT NULL,
    generation          TEXT NOT NULL,
    sha256              TEXT NOT NULL,
    mime_type           TEXT NOT NULL,
    byte_size           BIGINT NOT NULL,
    source_url          TEXT,
    exam_code           TEXT,
    is_pyq              BOOLEAN NOT NULL DEFAULT false,
    status              TEXT NOT NULL DEFAULT 'REGISTERED',
    registered_by       TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT content_engine_source_document_status_ck
      CHECK (status IN ('REGISTERED', 'QUARANTINED', 'SUPERSEDED', 'ARCHIVED')),
    -- Same bucket/object_name/generation can only ever be registered once --
    -- this is the immutability guarantee, enforced at the database level
    -- rather than left to application discipline.
    UNIQUE (bucket, object_name, generation)
);

CREATE INDEX IF NOT EXISTS content_engine_source_document_sha256_idx
  ON content_engine_source_document(sha256);

CREATE INDEX IF NOT EXISTS content_engine_source_document_status_idx
  ON content_engine_source_document(status, created_at DESC);

-- PYQ exclusion is a hard rule across the whole pipeline (see
-- content-engine-review-e2e.mjs for the platform-side enforcement already
-- in place for imports). Registering a document already known to be a PYQ
-- should still be possible -- the engine needs to see and quarantine it --
-- but nothing downstream should be able to treat a PYQ document as a valid
-- generation source once labelling begins, so this index makes an
-- "is this source a PYQ" check cheap everywhere it's needed.
CREATE INDEX IF NOT EXISTS content_engine_source_document_pyq_idx
  ON content_engine_source_document(is_pyq) WHERE is_pyq = true;
