-- Real password reset: a server-side, single-use, expiring token per
-- request -- the same "revocable, server-tracked" discipline user_session
-- already uses, rather than a stateless JWT that can't be invalidated.
CREATE TABLE password_reset_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_token_user_idx ON password_reset_token(user_id);
