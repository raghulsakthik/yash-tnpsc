-- Canonical AI privacy boundary. Personalized AI output must never be shared
-- between learners merely because they received the same question.
-- Generic/shared knowledge may use a separate cache later; this table stores
-- learner-contextual responses, so its cache key includes learner_id.

DROP INDEX IF EXISTS ai_interaction_cache_idx;
DROP INDEX IF EXISTS ai_interaction_topic_cache_idx;

CREATE UNIQUE INDEX ai_interaction_learner_question_cache_idx
    ON ai_interaction (learner_id, question_id, type)
    WHERE question_id IS NOT NULL;

CREATE UNIQUE INDEX ai_interaction_learner_topic_cache_idx
    ON ai_interaction (learner_id, topic_id, type)
    WHERE question_id IS NULL;
