ALTER TABLE app_user ADD COLUMN admin_role TEXT;
ALTER TABLE app_user ADD CONSTRAINT app_user_admin_role_ck CHECK (admin_role IS NULL OR admin_role IN ('super_admin','platform_admin','content_admin','question_bank_admin','subject_expert','question_reviewer','content_reviewer','ai_quality_admin','student_support_admin','analytics_admin','auditor'));
UPDATE app_user SET admin_role='super_admin' WHERE role IN ('ADMIN','SUPER_ADMIN') AND admin_role IS NULL;
ALTER TABLE app_user ADD CONSTRAINT app_user_admin_role_presence_ck CHECK ((role IN ('ADMIN','SUPER_ADMIN') AND admin_role IS NOT NULL) OR (role NOT IN ('ADMIN','SUPER_ADMIN') AND admin_role IS NULL));
CREATE TABLE admin_subject_scope (user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE, subject_id TEXT NOT NULL REFERENCES subject(id) ON DELETE CASCADE, PRIMARY KEY(user_id,subject_id));
CREATE INDEX admin_subject_scope_subject_idx ON admin_subject_scope(subject_id);
