-- The Admin Portal's Proctoring Hub has two real controls: toggling a
-- handful of boolean parameters on a security policy, and issuing a
-- decision (CLEAR/WARNING/FLAG/INVALIDATE/REVIEW_REQUIRED) on a completed
-- attempt. Neither had anywhere real to live -- proctoring_policy didn't
-- exist at all, and proctoring_session had no decision columns.
--
-- Seeded with the same three policies the UI's own mock data already
-- showed (same ids, so TestBuilderView's existing policy references don't
-- break), since there's no "create policy" control anywhere in the UI --
-- only edits to existing rows.
CREATE TABLE IF NOT EXISTS proctoring_policy (
    id                                    TEXT PRIMARY KEY,
    name                                  TEXT NOT NULL,
    enabled                               BOOLEAN NOT NULL DEFAULT true,
    fullscreen_required                   BOOLEAN NOT NULL DEFAULT false,
    tab_switch_detection                  BOOLEAN NOT NULL DEFAULT false,
    copy_paste_restricted                 BOOLEAN NOT NULL DEFAULT false,
    camera_required                       BOOLEAN NOT NULL DEFAULT false,
    microphone_required                   BOOLEAN NOT NULL DEFAULT false,
    identity_verification                 BOOLEAN NOT NULL DEFAULT false,
    face_presence_detection               BOOLEAN NOT NULL DEFAULT false,
    multiple_face_detection               BOOLEAN NOT NULL DEFAULT false,
    network_interruption_grace_period_sec INTEGER NOT NULL DEFAULT 60,
    max_violations_allowed                INTEGER NOT NULL DEFAULT 3,
    auto_submit_on_violation_limit        BOOLEAN NOT NULL DEFAULT false,
    manual_review_required                BOOLEAN NOT NULL DEFAULT false,
    learner_consent_notice                TEXT NOT NULL DEFAULT '',
    updated_at                            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO proctoring_policy (
    id, name, enabled, fullscreen_required, tab_switch_detection, copy_paste_restricted,
    camera_required, microphone_required, identity_verification, face_presence_detection,
    multiple_face_detection, network_interruption_grace_period_sec, max_violations_allowed,
    auto_submit_on_violation_limit, manual_review_required, learner_consent_notice
) VALUES
    ('proc-pol-strict', 'Official High-Stakes Proctored Mode', true, true, true, true,
     true, false, true, true,
     true, 90, 3,
     true, true,
     'This examination is supervised under NOVA Secure Integrity. Web camera feeds and browser focus are continuously monitored. Exiting full screen or switching tabs beyond 3 times will trigger automatic invalidation.'),
    ('proc-pol-standard', 'Standard Weekly Milestone Proctoring', true, true, true, true,
     false, false, false, false,
     false, 120, 5,
     false, false,
     'Milestone test proctoring active: Browser focus tracking and copy-paste prevention enabled for accurate ranking.'),
    ('proc-pol-practice', 'Open Diagnostic / Speed Drill (Unproctored)', false, false, false, false,
     false, false, false, false,
     false, 300, 99,
     false, false,
     'Self-paced practice mode. No proctoring events recorded.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE proctoring_session
    ADD COLUMN IF NOT EXISTS decision        TEXT,
    ADD COLUMN IF NOT EXISTS decision_reason TEXT,
    ADD COLUMN IF NOT EXISTS decided_by      UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS decided_at      TIMESTAMPTZ;

-- Guarded (not a plain ADD CONSTRAINT): a prior deploy racing the same
-- production database left an earlier Tests-section migration partially
-- applied without recording it, so every retry failed on the same
-- constraint already existing regardless of this file's version number --
-- see V77's history. Written idempotent from the start this time.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proctoring_session_decision_ck') THEN
        ALTER TABLE proctoring_session ADD CONSTRAINT proctoring_session_decision_ck
            CHECK (decision IS NULL OR decision IN ('CLEAR', 'WARNING', 'FLAG', 'INVALIDATE', 'REVIEW_REQUIRED'));
    END IF;
END $$;
