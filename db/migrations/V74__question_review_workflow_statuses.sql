-- Align the canonical question status values with the admin review workflow.
-- REVIEWED is retained for legacy rows; new review submissions use IN_REVIEW.
ALTER TABLE question DROP CONSTRAINT IF EXISTS question_status_ck;
ALTER TABLE question
  ADD CONSTRAINT question_status_ck
  CHECK (status IN ('DRAFT', 'IN_REVIEW', 'REVIEWED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'));
