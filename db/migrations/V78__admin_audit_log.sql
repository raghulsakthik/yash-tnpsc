-- The Admin Portal's recordAudit() has been called on every real admin
-- action wired so far this session (learner suspend, question create/
-- update, test create/publish, lesson save, notification broadcast, ...)
-- but it only ever did setAuditLogs(prev => [entry, ...prev]) -- pure
-- local React state, gone on refresh. There was no real audit trail
-- anywhere for any of these actions. content_engine_audit (V68) is a
-- narrower, unrelated table scoped to content import/approve/reject/
-- rollback only -- this is the general one recordAudit's call sites
-- already assume exists.
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID REFERENCES app_user (id) ON DELETE SET NULL,
    actor_role      TEXT,
    action          TEXT NOT NULL,
    entity          TEXT NOT NULL,
    entity_id       TEXT,
    reason          TEXT,
    before_snapshot JSONB,
    after_snapshot  JSONB,
    result          TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'DENIED', 'FAILED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log (created_at DESC);
