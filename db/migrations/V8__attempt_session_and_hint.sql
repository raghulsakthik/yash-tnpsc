-- Phase 8: the Lesson -> Practice pipeline needs the frontend to be able to
-- send `hintUsed` alongside answer/timeTaken/confidence (the brief's exact
-- list of what the client sends; the backend computes everything else), and
-- for an attempt to be linked to the learning_session it happened in at
-- insert time rather than a separate update afterward.
--
-- Both additive and nullable/defaulted: every existing row and every
-- existing INSERT into question_attempt (test submission, assessment
-- submission) continues to work unchanged.

ALTER TABLE question_attempt ADD COLUMN hint_used BOOLEAN NOT NULL DEFAULT false;
