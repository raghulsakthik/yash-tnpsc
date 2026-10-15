-- Notification preferences only — no delivery/push infrastructure here.
-- GET /api/notifications computes a live, honest "what's true right now"
-- feed from data that already exists; nothing is ever stored as "sent".

CREATE TABLE learner_notification_pref (
    learner_id        UUID PRIMARY KEY REFERENCES learner (id) ON DELETE CASCADE,
    daily_reminder    BOOLEAN NOT NULL DEFAULT true,
    revision_due_alert BOOLEAN NOT NULL DEFAULT true,
    streak_at_risk    BOOLEAN NOT NULL DEFAULT true,
    milestone_alert   BOOLEAN NOT NULL DEFAULT true,
    weekly_review     BOOLEAN NOT NULL DEFAULT false,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
