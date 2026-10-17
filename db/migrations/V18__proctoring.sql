-- Proctoring: one session per test attempt, holding where its camera/screen
-- recordings live on disk (see src/lib/proctoringStorage.mjs) plus a running
-- log of monitoring events (tab switches, fullscreen exits, lost camera).
-- Recording bytes themselves are NOT stored in Postgres -- video is too
-- large for that; this table only tracks metadata and file paths.

CREATE TABLE proctoring_session (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id       UUID NOT NULL UNIQUE REFERENCES test (id) ON DELETE CASCADE,
    learner_id    UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'RECORDING',
    has_camera    BOOLEAN NOT NULL DEFAULT false,
    has_screen    BOOLEAN NOT NULL DEFAULT false,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at      TIMESTAMPTZ,
    CONSTRAINT proctoring_session_status_ck CHECK (status IN ('RECORDING', 'COMPLETED', 'ABANDONED'))
);

CREATE TABLE proctoring_event (
    id          BIGSERIAL PRIMARY KEY,
    session_id  UUID NOT NULL REFERENCES proctoring_session (id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT proctoring_event_type_ck CHECK (
      event_type IN ('TAB_HIDDEN', 'TAB_VISIBLE', 'FULLSCREEN_EXIT', 'FULLSCREEN_ENTER', 'CAMERA_LOST', 'SCREEN_SHARE_LOST', 'CONSENT_DENIED')
    )
);

CREATE INDEX proctoring_event_session_idx ON proctoring_event (session_id, created_at);
