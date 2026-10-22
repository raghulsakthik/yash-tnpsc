-- Admin-managed test templates. Before this, every weekly test was
-- generated from one hardcoded chapter pair (aptitude + reasoning) with no
-- way to configure it. A template names a target question count and a set
-- of topics (with how many questions to pull from each); POST /api/tests
-- uses a template's composition when one is specified, and keeps the old
-- hardcoded behavior as the default otherwise, so nothing already running
-- breaks.

CREATE TABLE test_template (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    description    TEXT,
    question_count INTEGER NOT NULL DEFAULT 25,
    active         BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT test_template_question_count_ck CHECK (question_count > 0)
);

CREATE TABLE test_template_topic (
    template_id  UUID NOT NULL REFERENCES test_template (id) ON DELETE CASCADE,
    topic_id     TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    target_count INTEGER NOT NULL,
    PRIMARY KEY (template_id, topic_id),
    CONSTRAINT test_template_topic_count_ck CHECK (target_count > 0)
);

ALTER TABLE test ADD COLUMN template_id UUID REFERENCES test_template (id) ON DELETE SET NULL;
