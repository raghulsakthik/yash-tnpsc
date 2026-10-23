-- Async bulk upload (content-intelligence spec sections 31-32): no Redis/
-- queue infra exists in this app and none is worth adding just for this --
-- a plain Postgres job table plus Next's after() (backed by Vercel's
-- waitUntil) gets the same real outcome: the upload request returns
-- immediately instead of blocking on however long AI classification of
-- potentially 100+ files takes, and progress is visible and persisted
-- rather than lost if the admin closes the tab.

CREATE TABLE content_processing_batch (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by  UUID REFERENCES app_user (id),
    file_count  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_processing_job (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID NOT NULL REFERENCES content_processing_batch (id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    source_year     INTEGER,
    status          TEXT NOT NULL DEFAULT 'QUEUED',
    result          JSONB,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT content_processing_job_status_ck CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX content_processing_job_batch_idx ON content_processing_job (batch_id);
CREATE INDEX content_processing_job_status_idx ON content_processing_job (status);
