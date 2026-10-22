-- Two new AI uses need room this table didn't have:
--   DEEPEN                a tip for a correct-but-slow/low-confidence answer
--   ALTERNATE_EXPLANATION a second angle on a lesson's concept, not tied to
--                         any one question
-- The second one has no question_id, so that column has to allow NULL --
-- its cache key becomes (topic_id, type) for those rows instead of
-- (question_id, type).

ALTER TABLE ai_interaction ALTER COLUMN question_id DROP NOT NULL;

ALTER TABLE ai_interaction DROP CONSTRAINT ai_interaction_type_ck;
ALTER TABLE ai_interaction ADD CONSTRAINT ai_interaction_type_ck
  CHECK (type IN ('HINT', 'EXPLANATION', 'DEEPEN', 'ALTERNATE_EXPLANATION'));

-- The existing (question_id, type) unique index already dedupes the
-- per-question types; Postgres unique indexes never dedupe NULLs against
-- each other, so a second index covers the question_id IS NULL rows.
CREATE UNIQUE INDEX ai_interaction_topic_cache_idx ON ai_interaction (topic_id, type) WHERE question_id IS NULL;
