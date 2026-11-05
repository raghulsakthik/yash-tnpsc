-- The Admin Portal's Learners section (suspend/reactivate) already
-- collects a reason from the admin -- there was nowhere real to put it,
-- so it only ever lived in the browser's localStorage. app_user.status
-- itself (ACTIVE/SUSPENDED/DELETED) already exists; this just adds the
-- one column the real write-path needs.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
