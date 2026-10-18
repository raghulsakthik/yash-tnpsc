-- Saved-for-later questions. Every leading exam-prep platform has this;
-- this app didn't. A learner can star any question from practice,
-- revision, mistakes, a test, or a PYQ and come back to it later from
-- /bookmarks, independent of whatever selection algorithm would otherwise
-- decide what she sees next.

CREATE TABLE question_bookmark (
    learner_id  UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (learner_id, question_id)
);
