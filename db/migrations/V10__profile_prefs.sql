-- Settings that have somewhere real to live, on the profile row that
-- already exists. difficulty_bias is a genuinely new behavior (wired into
-- question selection's targetDifficulty), not just stored and ignored.

ALTER TABLE learner_profile
    ADD COLUMN preferred_time TEXT,
    ADD COLUMN rest_day TEXT,
    ADD COLUMN difficulty_bias TEXT NOT NULL DEFAULT 'normal',
    ADD CONSTRAINT learner_profile_difficulty_bias_ck CHECK (difficulty_bias IN ('gentle', 'normal', 'hard'));
