-- Phase 11.1: persistent document-processing jobs.
-- The source bytes live with the job for now so a worker can resume after the
-- admin closes the browser. Phase 12 can move source_data to object storage
-- without changing the job state machine or API contract.
ALTER TABLE content_processing_batch
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD CONSTRAINT content_processing_batch_status_ck CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED'));

ALTER TABLE content_processing_job
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS source_data BYTEA,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD CONSTRAINT content_processing_job_stage_ck CHECK (stage IN ('QUEUED','EXTRACTING','CLASSIFYING','VALIDATING','READY_FOR_REVIEW','COMPLETED','FAILED'));

CREATE INDEX IF NOT EXISTS content_processing_batch_status_idx ON content_processing_batch(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_processing_job_batch_status_idx ON content_processing_job(batch_id, status, created_at);
