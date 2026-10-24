-- Real, persistent read/dismiss state for the notification center.
-- Notifications themselves are derived (achievement unlocks + nudge
-- events, src/app/api/notifications/route.js) rather than stored rows --
-- this tracks what the learner has actually done with each one, keyed by
-- a stable id the API computes from the underlying real event/achievement.
CREATE TABLE notification_state (
    learner_id       UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL,
    read_at          TIMESTAMPTZ,
    dismissed_at     TIMESTAMPTZ,
    PRIMARY KEY (learner_id, notification_key)
);
