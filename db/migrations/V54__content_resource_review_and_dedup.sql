-- Phase 11: study-material review parity + safer bulk duplicate handling.
-- AI-extracted resources must remain unpublished until human approval, just
-- like extracted MCQs. Existing resources are treated as already trusted.
ALTER TABLE topic_resource
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES app_user(id),
  ADD CONSTRAINT topic_resource_status_ck CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'));

ALTER TABLE content_review_batch
  ADD COLUMN IF NOT EXISTS resource_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS topic_resource_status_idx ON topic_resource(status, created_at DESC);
