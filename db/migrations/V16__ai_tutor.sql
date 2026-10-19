-- Phase 29: AI Training, Knowledge & Personalization Engine.
--
-- Widens ai_interaction (V4, Phase 8-ish) rather than building a parallel
-- log/cache table: question_id becomes optional (several of 29.4's ten
-- capabilities — Teach Prerequisite, Compare Two Concepts, Summarize
-- Topic, Generate Revision Notes — are topic-level, not about one
-- question), the type vocabulary widens to the brief's own ten task names
-- (the original HINT/EXPLANATION values stay valid — POST /api/ai/hint,
-- Phase 8, still writes 'EXPLANATION' unchanged), and a nullable
-- intervention_id links an AI interaction to the real Phase 14 tracking
-- row already measuring whether help on this topic is working — 29.7's
-- feedback loop, closed by reuse, not a second tracking mechanism.
ALTER TABLE ai_interaction ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE ai_interaction ADD COLUMN intervention_id UUID NULL REFERENCES intervention(id) ON DELETE SET NULL;

ALTER TABLE ai_interaction DROP CONSTRAINT ai_interaction_type_ck;
ALTER TABLE ai_interaction ADD CONSTRAINT ai_interaction_type_ck CHECK (type IN (
  'HINT', 'EXPLANATION', -- legacy, Phase 8, unchanged meaning
  'EXPLAIN_SIMPLY', 'GIVE_HINT', 'SHOW_EXAMPLE', 'TEACH_PREREQUISITE',
  'SOLVE_STEP_BY_STEP', 'EXPLAIN_MISTAKE', 'SIMILAR_QUESTION',
  'COMPARE_CONCEPTS', 'SUMMARIZE_TOPIC', 'REVISION_NOTES'
));

-- question_id-scoped caching only made sense when every row had one; a
-- topic-level task (question_id NULL) now caches per (topic_id, type)
-- instead, via COALESCE rather than relying on NULL's own (non-)equality.
DROP INDEX ai_interaction_cache_idx;
CREATE UNIQUE INDEX ai_interaction_cache_idx ON ai_interaction (topic_id, type, COALESCE(question_id, ''));
