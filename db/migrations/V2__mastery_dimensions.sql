-- Adds the mastery dimensions beyond accuracy/speed: concept (lifetime,
-- unweighted accuracy), consistency, confidence calibration, retention
-- (fed by revision_schedule, see V3) and the combined mastery_score.
-- Computed in src/domain/mastery.mjs, written by the attempts route.

ALTER TABLE learner_topic_state
    ADD COLUMN concept_score     NUMERIC(4, 3) NOT NULL DEFAULT 0,
    ADD COLUMN consistency_score NUMERIC(4, 3) NOT NULL DEFAULT 0,
    ADD COLUMN confidence_score  NUMERIC(4, 3) NOT NULL DEFAULT 0,
    ADD COLUMN retention_score   NUMERIC(4, 3) NOT NULL DEFAULT 0,
    ADD COLUMN mastery_score     NUMERIC(4, 3) NOT NULL DEFAULT 0;
