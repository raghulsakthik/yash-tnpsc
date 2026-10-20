-- Granular admin roles + permissions (content-intelligence spec sections
-- 26-29), extending account.role rather than replacing it -- 'admin' stays
-- the broad category every admin UI route already checks via
-- requireAdmin(); admin_role is the finer-grained role *within* that
-- category, only meaningful when role = 'admin'.
--
-- Every existing admin account defaults to 'super_admin' (full access,
-- bypasses subject scoping) -- this is a pure addition, not a narrowing:
-- nothing that worked before this migration loses access because of it.

ALTER TABLE account ADD COLUMN admin_role TEXT;
ALTER TABLE account ADD CONSTRAINT account_admin_role_ck CHECK (
    admin_role IS NULL OR admin_role IN (
        'super_admin', 'platform_admin', 'content_admin', 'question_bank_admin',
        'subject_expert', 'question_reviewer', 'content_reviewer', 'ai_quality_admin',
        'student_support_admin', 'analytics_admin', 'auditor'
    )
);

-- Backfill before adding the presence constraint below -- every existing
-- admin row still has admin_role = NULL at this point.
UPDATE account SET admin_role = 'super_admin' WHERE role = 'admin';

ALTER TABLE account ADD CONSTRAINT account_admin_role_presence_ck CHECK (
    (role = 'admin' AND admin_role IS NOT NULL) OR (role <> 'admin' AND admin_role IS NULL)
);

-- A SUBJECT_EXPERT's write access is restricted to these subjects; empty
-- for every other role (they're either unrestricted via their role's own
-- permission set, or the role doesn't carry subject-scoped permissions at
-- all). A subject_expert account with zero rows here has no write access
-- yet, not full access -- the safe default for a newly-created restricted
-- role.
CREATE TABLE admin_subject_scope (
    account_id UUID NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subject (id) ON DELETE CASCADE,
    PRIMARY KEY (account_id, subject_id)
);
