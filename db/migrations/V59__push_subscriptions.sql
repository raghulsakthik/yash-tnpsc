-- Web Push subscriptions. One row per browser/device she's enabled
-- notifications on, since a push endpoint is tied to a specific browser
-- installation, not the learner. Deleting a subscription (she revokes
-- permission, or a send comes back 410 Gone) just removes that device --
-- others keep working.

CREATE TABLE push_subscription (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id  UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_subscription_learner_id_idx ON push_subscription (learner_id);
