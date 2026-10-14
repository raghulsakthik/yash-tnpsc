-- Phase 3: the Default Foundation Test. Extends the generic `assessment`
-- table from V6 with its own question-set and answer tables — deliberately
-- separate from `test`/`test_question`/`test_answer` (V5), which already
-- implement the one specific assessment the app ships (the weekly
-- aptitude+reasoning test) and are not touched here.
--
-- assessment_answer carries `confidence`, which test_answer does not: the
-- Default Foundation Test is explicitly asked to measure confidence
-- calibration as part of the initial learner model.

ALTER TABLE assessment ADD COLUMN question_count INT NULL;
ALTER TABLE assessment ADD COLUMN score NUMERIC(5,2) NULL;
ALTER TABLE assessment ADD COLUMN completed_at TIMESTAMPTZ NULL;

CREATE TABLE assessment_question (
  assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  order_index   INT NOT NULL,
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE assessment_answer (
  assessment_id  UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  selected_index INT NULL,
  time_taken_ms  INT NULL,
  confidence     INT NULL CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5),
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, question_id)
);
