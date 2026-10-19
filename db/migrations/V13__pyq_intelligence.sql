-- Phase 26: TNPSC PYQ Intelligence & Question Content Engine.
--
-- question already carries source/source_year/status/normalized_hash
-- (V1, unchanged) — the brief's "Exam", "Year", "Subject/Chapter/Topic" (via
-- topic_id's existing FK chain) and "Validation status" are already real
-- columns. Four genuinely new, nullable fields for provenance this project
-- doesn't yet have transcribed for any real question (no TNPSC PDF/paper/
-- page-number source material exists in this repo) — left NULL on existing
-- rows rather than fabricated, ready to receive real values the day actual
-- paper scans are transcribed.
ALTER TABLE question
  ADD COLUMN paper           TEXT NULL,
  ADD COLUMN question_number INT  NULL,
  ADD COLUMN source_page     INT  NULL,
  ADD COLUMN content_version INT  NOT NULL DEFAULT 1;

-- 26.5's provenance/storage/review framework for TNPSC-inspired (AI
-- generated) MCQs — distinct from `question` by design, so a generated,
-- unreviewed item can never be confused with a real, authoritative PYQ or
-- authored question. Starts empty: no AI provider is configured in this
-- environment, so nothing has been generated yet (see completion report).
CREATE TABLE generated_question (
  id                TEXT PRIMARY KEY,
  topic_id          TEXT    NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
  language          TEXT    NOT NULL,
  prompt            TEXT    NOT NULL,
  options           JSONB   NOT NULL,
  answer_index      INTEGER NOT NULL,
  explanation       TEXT    NOT NULL,
  difficulty        NUMERIC(3, 2) NOT NULL,
  source_pyq_ids    TEXT[]  NOT NULL DEFAULT '{}', -- the real PYQ(s) this was patterned after
  source_pattern    TEXT,                          -- the recurring question pattern it was generated from
  concept           TEXT,                          -- the concept it targets
  generation_model  TEXT    NOT NULL,               -- which model/version generated it
  generation_version TEXT   NOT NULL,
  validation_status TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (validation_status IN ('PENDING', 'ANSWER_VALIDATED', 'DUPLICATE', 'DIFFICULTY_MISMATCH', 'REJECTED')),
  review_status     TEXT    NOT NULL DEFAULT 'PENDING'
                    CHECK (review_status IN ('PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED')),
  normalized_hash   TEXT    NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT generated_question_language_ck   CHECK (language IN ('ta', 'en')),
  CONSTRAINT generated_question_difficulty_ck CHECK (difficulty >= 0 AND difficulty <= 1),
  CONSTRAINT generated_question_answer_ck     CHECK (answer_index >= 0)
);

CREATE INDEX generated_question_review_idx ON generated_question (review_status);
