-- Phase 29: AI Training, Knowledge & Personalization Engine.
--
-- Widens ai_interaction (V4, Phase 8-ish) rather than building a parallel
-- log/cache table. V9__ai_interaction_types (an earlier, unrelated commit
-- on this shared history) already made question_id nullable, already
-- widened the type CHECK to add its own two topic-level task types
-- (DEEPEN, ALTERNATE_EXPLANATION), and already added a real, working
-- partial unique index (ai_interaction_topic_cache_idx) for the
-- question_id IS NULL case, alongside the original (question_id, type)
-- index for everything else — that two-index scheme is reused unchanged
-- here, not replaced. This migration only adds what's genuinely new: ten
-- more real task names this phase introduces, and a nullable
-- intervention_id linking an AI interaction to the real Phase 14 tracking
-- row already measuring whether help on this topic is working — 29.7's
-- feedback loop, closed by reuse, not a second tracking mechanism.
ALTER TABLE ai_interaction ADD COLUMN intervention_id UUID NULL REFERENCES intervention(id) ON DELETE SET NULL;

ALTER TABLE ai_interaction DROP CONSTRAINT ai_interaction_type_ck;
ALTER TABLE ai_interaction ADD CONSTRAINT ai_interaction_type_ck CHECK (type IN (
  'HINT', 'EXPLANATION', -- legacy, Phase 8, unchanged meaning
  'DEEPEN', 'ALTERNATE_EXPLANATION', -- V9__ai_interaction_types, unchanged meaning
  'EXPLAIN_SIMPLY', 'GIVE_HINT', 'SHOW_EXAMPLE', 'TEACH_PREREQUISITE',
  'SOLVE_STEP_BY_STEP', 'EXPLAIN_MISTAKE', 'SIMILAR_QUESTION',
  'COMPARE_CONCEPTS', 'SUMMARIZE_TOPIC', 'REVISION_NOTES'
));
