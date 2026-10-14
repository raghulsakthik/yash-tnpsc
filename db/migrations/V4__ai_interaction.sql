-- AI hint/explanation log, also used as the cache: one stored response per
-- (question, type) is reused instead of calling the provider again. Logged
-- even on a cache hit is not required — only the generating call writes a row.

CREATE TABLE ai_interaction (
    id              BIGSERIAL PRIMARY KEY,
    learner_id      UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    topic_id        TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    prompt_context  JSONB NOT NULL,
    response        TEXT NOT NULL,
    model           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_interaction_type_ck CHECK (type IN ('HINT', 'EXPLANATION'))
);

CREATE UNIQUE INDEX ai_interaction_cache_idx ON ai_interaction (question_id, type);
