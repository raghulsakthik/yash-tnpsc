-- Production infrastructure support: indexes used by health, processing and lineage operations.
CREATE INDEX IF NOT EXISTS content_lineage_question_idx ON content_lineage(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_lineage_resource_idx ON content_lineage(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_processing_job_stage_idx ON content_processing_job(stage, updated_at DESC);
