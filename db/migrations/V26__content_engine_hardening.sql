-- Phase 30: production hardening constraints and indexes.
-- Prevent two simultaneously published engine lesson versions for one topic.
CREATE UNIQUE INDEX IF NOT EXISTS content_engine_one_published_lesson_per_topic_idx
  ON content_engine_lesson_version(topic_id)
  WHERE status='PUBLISHED';

-- Fast lookup for active learner lineage and rollback/audit operations.
CREATE INDEX IF NOT EXISTS content_engine_lineage_active_topic_idx
  ON content_engine_lineage(topic_id, content_kind, version_number DESC)
  WHERE status='PUBLISHED';

-- Audit is append-only by application contract; these indexes support bounded history reads.
CREATE INDEX IF NOT EXISTS content_engine_audit_action_idx
  ON content_engine_audit(action, created_at DESC);
