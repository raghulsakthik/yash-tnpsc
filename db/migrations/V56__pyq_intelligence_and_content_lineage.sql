-- Phase 11.2/11.3: authoritative PYQ metadata + immutable content provenance.
-- A real PYQ is more than source_year: preserve the paper/question/page identity,
-- exam identity, and syllabus snapshot needed to audit it later.
ALTER TABLE question
  ADD COLUMN IF NOT EXISTS exam_code TEXT,
  ADD COLUMN IF NOT EXISTS exam_group TEXT,
  ADD COLUMN IF NOT EXISTS paper TEXT,
  ADD COLUMN IF NOT EXISTS question_number INTEGER,
  ADD COLUMN IF NOT EXISTS source_page INTEGER;

ALTER TABLE content_processing_batch
  ADD COLUMN IF NOT EXISTS exam_code TEXT,
  ADD COLUMN IF NOT EXISTS exam_group TEXT,
  ADD COLUMN IF NOT EXISTS paper TEXT;

ALTER TABLE content_processing_job
  ADD COLUMN IF NOT EXISTS exam_code TEXT,
  ADD COLUMN IF NOT EXISTS exam_group TEXT,
  ADD COLUMN IF NOT EXISTS paper TEXT;

-- V39's reviewer update path needs this on the review batch itself.
ALTER TABLE content_review_batch
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES app_user(id);

CREATE INDEX IF NOT EXISTS question_pyq_identity_idx
  ON question(exam_code, exam_group, source_year, paper, question_number)
  WHERE source_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS question_pyq_topic_year_idx
  ON question(topic_id, source_year)
  WHERE source_year IS NOT NULL;

-- Immutable provenance for every content item introduced by the ingestion
-- pipeline. Existing legacy rows can remain unlinked because their original
-- file/page provenance was never captured; new learner-facing imports must
-- create a lineage row before they enter review.
CREATE TABLE IF NOT EXISTS content_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT REFERENCES question(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES topic_resource(id) ON DELETE CASCADE,
  processing_batch_id UUID REFERENCES content_processing_batch(id) ON DELETE SET NULL,
  processing_job_id UUID REFERENCES content_processing_job(id) ON DELETE SET NULL,
  review_batch_id UUID REFERENCES content_review_batch(id) ON DELETE SET NULL,
  source_file_name TEXT,
  source_page INTEGER,
  source_question_number INTEGER,
  source_year INTEGER,
  exam_code TEXT,
  exam_group TEXT,
  paper TEXT,
  subject_id TEXT REFERENCES subject(id) ON DELETE SET NULL,
  chapter_id TEXT REFERENCES chapter(id) ON DELETE SET NULL,
  topic_id TEXT REFERENCES topic(id) ON DELETE SET NULL,
  content_version INTEGER NOT NULL DEFAULT 1,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_lineage_one_item_ck CHECK ((question_id IS NOT NULL) <> (resource_id IS NOT NULL)),
  CONSTRAINT content_lineage_page_ck CHECK (source_page IS NULL OR source_page > 0),
  CONSTRAINT content_lineage_question_number_ck CHECK (source_question_number IS NULL OR source_question_number > 0)
);

CREATE INDEX IF NOT EXISTS content_lineage_question_idx ON content_lineage(question_id);
CREATE INDEX IF NOT EXISTS content_lineage_resource_idx ON content_lineage(resource_id);
CREATE INDEX IF NOT EXISTS content_lineage_source_idx ON content_lineage(source_year, exam_group, paper, source_page);
CREATE UNIQUE INDEX IF NOT EXISTS content_lineage_question_unique_idx ON content_lineage(question_id) WHERE question_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS content_lineage_resource_unique_idx ON content_lineage(resource_id) WHERE resource_id IS NOT NULL;
