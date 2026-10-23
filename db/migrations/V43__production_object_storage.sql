ALTER TABLE content_processing_job
  ADD COLUMN IF NOT EXISTS source_object_key TEXT,
  ADD COLUMN IF NOT EXISTS source_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS source_sha256 TEXT;

CREATE INDEX IF NOT EXISTS content_processing_job_source_object_idx
  ON content_processing_job(source_object_key)
  WHERE source_object_key IS NOT NULL;
