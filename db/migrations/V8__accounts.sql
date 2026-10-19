-- Real login. Three roles:
--   'learner' -- a normal account, tied to one learner row (her own
--               mastery/attempts/tests -- the real data).
--   'test'    -- same shape as 'learner', but tied to its own separate
--               learner row, so trying things never touches real data.
--   'admin'   -- no learner_id; manages content, not her progress.
--
-- Sessions are server-side rows, not stateless JWTs, so a login can
-- actually be revoked (logout, or a forced sign-out) rather than just
-- expiring on its own schedule.

CREATE TABLE account (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('learner', 'test', 'admin')),
    learner_id    UUID REFERENCES learner (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT account_learner_role_ck CHECK (
        (role = 'admin' AND learner_id IS NULL) OR
        (role IN ('learner', 'test') AND learner_id IS NOT NULL)
    )
);

CREATE TABLE session (
    token      TEXT PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX session_account_id_idx ON session (account_id);
CREATE INDEX session_expires_at_idx ON session (expires_at);
