-- Phase 27: Adaptive Testing, Diagnostics & Recommendation Engine.
--
-- `assessment`/`assessment_question`/`assessment_answer` (V6/V7) were built
-- explicitly as "the forward-looking shape for the assessment types Phase
-- 9+ will add" — only DEFAULT_TEST has used it so far. This widens the one
-- CHECK constraint restricting `type` to add ADAPTIVE_TEST, reusing the
-- entire existing schema (including `metadata JSONB`, where the real
-- blueprint this test was built from is stored) rather than a parallel
-- table. Nothing existing is narrowed or dropped.
ALTER TABLE assessment DROP CONSTRAINT assessment_type_check;
ALTER TABLE assessment ADD CONSTRAINT assessment_type_check
  CHECK (type IN ('DEFAULT_TEST', 'DIAGNOSTIC', 'MINI_ASSESSMENT', 'WEEKLY_TEST', 'ADAPTIVE_TEST'));

-- 27.5/27.6: a scored Next Best Action becomes a real, trackable row the
-- moment it's surfaced — accept/start/complete status transitions the
-- brief's own lifecycle diagram asks for. Accepting one that targets a
-- topic starts a real Phase 14 `intervention` row (reused, unchanged) to
-- measure whether it actually worked — recommendation tracks "was this
-- surfaced and acted on", intervention tracks "did it work", kept as two
-- separate, honest questions rather than one table doing both jobs.
CREATE TABLE recommendation (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  target_topic_id   TEXT NULL REFERENCES topic(id) ON DELETE SET NULL,
  duration_minutes  INT NULL,
  difficulty        TEXT NULL,
  reason            TEXT NOT NULL,
  confidence        NUMERIC(4,3) NOT NULL,
  score_breakdown   JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACCEPTED', 'DISMISSED')),
  intervention_id   UUID NULL REFERENCES intervention(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ NULL
);

CREATE INDEX recommendation_learner_status_idx ON recommendation (learner_id, status, created_at DESC);
