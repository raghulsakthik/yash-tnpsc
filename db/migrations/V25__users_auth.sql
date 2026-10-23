-- Multi-user authentication. Existing learner data remains intact.
CREATE TABLE app_user (
    id UUID PRIMARY KEY REFERENCES learner(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT app_user_role_ck CHECK (role IN ('STUDENT','TEACHER','CONTENT_MANAGER','REVIEWER','ADMIN','SUPER_ADMIN')),
    CONSTRAINT app_user_status_ck CHECK (status IN ('ACTIVE','SUSPENDED','DELETED'))
);

CREATE UNIQUE INDEX app_user_email_lower_idx ON app_user (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_session_user_idx ON user_session(user_id);
CREATE INDEX user_session_expiry_idx ON user_session(expires_at);

-- First registration can claim the existing single-learner record safely.
-- The legacy learner is not made directly loginable until credentials are set.
INSERT INTO app_user (id, role, status)
SELECT id, 'STUDENT', 'ACTIVE' FROM learner
WHERE id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (id) DO NOTHING;
