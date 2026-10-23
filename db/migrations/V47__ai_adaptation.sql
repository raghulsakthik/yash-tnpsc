-- Phase 30: AI Adaptation, Model Optimization & Learning Intelligence.

-- 30.1-30.6 add five new narration tasks to the AI Tutor dispatch
-- (ai_interaction, V4/V9/V29) — the same widen-don't-replace pattern.
ALTER TABLE ai_interaction DROP CONSTRAINT ai_interaction_type_ck;
ALTER TABLE ai_interaction ADD CONSTRAINT ai_interaction_type_ck CHECK (type IN (
  'HINT', 'EXPLANATION',
  'DEEPEN', 'ALTERNATE_EXPLANATION',
  'EXPLAIN_SIMPLY', 'GIVE_HINT', 'SHOW_EXAMPLE', 'TEACH_PREREQUISITE',
  'SOLVE_STEP_BY_STEP', 'EXPLAIN_MISTAKE', 'SIMILAR_QUESTION',
  'COMPARE_CONCEPTS', 'SUMMARIZE_TOPIC', 'REVISION_NOTES',
  'INTERPRET_PATTERNS', 'EXPLAIN_RECOMMENDATION', 'ANALYZE_TEST',
  'EXPLAIN_TEST_CONSTRUCTION', 'EXPLAIN_READINESS'
));

-- 30.2: a real snapshot of the learner's AI context (Phase 29.3's own
-- shape) at the moment an intervention started — strengthens "store...
-- learnerState" without a second tracking table. Nullable: existing
-- interventions from before this phase never had one captured.
ALTER TABLE intervention ADD COLUMN learner_state_snapshot JSONB NULL;

-- 30.7: every AI capability's real version is a named constant
-- (aiVersions.mjs); this is the real, queryable history that makes
-- "v1 -> 72%, v2 -> 84%" an honest comparison over time rather than a
-- single, overwritten number.
CREATE TABLE ai_evaluation_run (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability        TEXT NOT NULL, -- e.g. 'ai-tutor', 'pyq-explainer'
  model_version      TEXT NOT NULL,
  prompt_version      TEXT NOT NULL,
  retrieval_version    TEXT NOT NULL,
  dataset_version      TEXT NOT NULL,
  algorithm_version    TEXT NOT NULL,
  total_items        INT NOT NULL,
  pass_rate          NUMERIC(5,3) NULL,
  average_correctness NUMERIC(5,3) NULL,
  hallucination_rate  NUMERIC(5,3) NOT NULL,
  run_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_evaluation_run_capability_idx ON ai_evaluation_run (capability, run_at DESC);
