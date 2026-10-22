-- Yash slice 1 schema.
-- Deliberately small. Columns for the full mastery model are added in later
-- migrations, when the engines that use them exist. See docs: "Schema perfectionism".

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- learner

CREATE TABLE learner (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learner_profile (
    learner_id          UUID PRIMARY KEY REFERENCES learner (id) ON DELETE CASCADE,
    exam                TEXT    NOT NULL DEFAULT 'tnpsc-prelims-495',
    -- 'ta' or 'en': which language paper she sits. Decides half the content served.
    language            TEXT    NOT NULL DEFAULT 'en',
    daily_goal_minutes  INTEGER NOT NULL DEFAULT 30,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT learner_profile_language_ck CHECK (language IN ('ta', 'en'))
);

-- ------------------------------------------------------------- syllabus tree
-- Seeded from content/syllabus/*.yaml. Never edited by hand in the database.

CREATE TABLE subject (
    id          TEXT PRIMARY KEY,          -- e.g. 'general-studies'
    name        TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL
);

CREATE TABLE chapter (
    id          TEXT PRIMARY KEY,          -- e.g. 'gs.indian-polity'
    subject_id  TEXT    NOT NULL REFERENCES subject (id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL,
    -- The official number of questions this unit carries in the real paper.
    -- This is what makes examWeight honest instead of invented.
    question_count INTEGER NOT NULL
);

CREATE TABLE topic (
    id          TEXT PRIMARY KEY,          -- e.g. 'aptitude.ratio-and-proportion'
    chapter_id  TEXT    NOT NULL REFERENCES chapter (id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL
);

-- Weighted directed edges. Only populated where a dependency is real
-- (aptitude); left empty for recall subjects rather than invented.
CREATE TABLE topic_prerequisite (
    topic_id              TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    prerequisite_topic_id TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    strength              NUMERIC(3, 2) NOT NULL,
    PRIMARY KEY (topic_id, prerequisite_topic_id),
    CONSTRAINT topic_prerequisite_strength_ck CHECK (strength > 0 AND strength <= 1),
    CONSTRAINT topic_prerequisite_no_self_ck CHECK (topic_id <> prerequisite_topic_id)
);

-- ------------------------------------------------------------------ content

CREATE TABLE question (
    id                TEXT PRIMARY KEY,    -- stable authored id, e.g. 'fractions-001'
    topic_id          TEXT    NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    language          TEXT    NOT NULL,
    prompt            TEXT    NOT NULL,
    options           JSONB   NOT NULL,    -- array of strings
    answer_index      INTEGER NOT NULL,    -- index into options, never the text
    explanation       TEXT    NOT NULL,
    trap              TEXT,                -- why the tempting wrong option is tempting
    difficulty        NUMERIC(3, 2) NOT NULL,
    estimated_seconds INTEGER NOT NULL DEFAULT 60,
    source            TEXT    NOT NULL DEFAULT 'authored',
    source_year       INTEGER,
    status            TEXT    NOT NULL DEFAULT 'PUBLISHED',
    normalized_hash   TEXT    NOT NULL,    -- duplicate detection
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT question_language_ck   CHECK (language IN ('ta', 'en')),
    CONSTRAINT question_difficulty_ck CHECK (difficulty >= 0 AND difficulty <= 1),
    CONSTRAINT question_answer_ck     CHECK (answer_index >= 0),
    CONSTRAINT question_status_ck     CHECK (status IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED'))
);

CREATE INDEX question_topic_difficulty_idx ON question (topic_id, language, difficulty)
    WHERE status = 'PUBLISHED';
CREATE UNIQUE INDEX question_normalized_hash_idx ON question (language, normalized_hash);

-- ------------------------------------------------------------------ attempts

CREATE TABLE question_attempt (
    -- Supplied by the client so a retried submission is idempotent.
    id              UUID PRIMARY KEY,
    learner_id      UUID    NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    question_id     TEXT    NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    topic_id        TEXT    NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    selected_index  INTEGER,               -- null means skipped
    correct         BOOLEAN NOT NULL,
    time_taken_ms   INTEGER NOT NULL,
    confidence      INTEGER,               -- 1..5, null if not asked
    mistake_type    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT question_attempt_confidence_ck CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5)
);

CREATE INDEX question_attempt_learner_topic_idx
    ON question_attempt (learner_id, topic_id, created_at DESC);

-- --------------------------------------------------------- learner topic state
-- The most important table. Six live columns in slice 1; the rest of the
-- mastery dimensions arrive with the engines that compute them.

CREATE TABLE learner_topic_state (
    learner_id          UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    topic_id            TEXT NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    accuracy_score      NUMERIC(4, 3) NOT NULL DEFAULT 0,    -- recency weighted
    speed_score         NUMERIC(4, 3) NOT NULL DEFAULT 0,
    current_difficulty  NUMERIC(3, 2) NOT NULL DEFAULT 0.30,
    attempt_count       INTEGER NOT NULL DEFAULT 0,
    correct_count       INTEGER NOT NULL DEFAULT 0,
    consecutive_wrong   INTEGER NOT NULL DEFAULT 0,
    next_action         TEXT    NOT NULL DEFAULT 'PRACTICE',
    last_studied_at     TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (learner_id, topic_id),
    CONSTRAINT learner_topic_state_difficulty_ck CHECK (current_difficulty >= 0 AND current_difficulty <= 1)
);

-- ------------------------------------------------------------------- events
-- Append only. Analytics reads this; the learning engine never does.

CREATE TABLE learning_event (
    id          BIGSERIAL PRIMARY KEY,
    learner_id  UUID        NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    event       TEXT        NOT NULL,
    topic_id    TEXT,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX learning_event_learner_created_idx ON learning_event (learner_id, created_at DESC);
