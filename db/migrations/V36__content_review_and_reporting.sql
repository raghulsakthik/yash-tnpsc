-- content_review_batch (V21) and content_report (V22) already exist.
-- content_report.reviewed_by was pointed at learner -- the real reviewer
-- is an admin, i.e. an app_user row, not a learner.
ALTER TABLE content_report DROP CONSTRAINT content_report_reviewed_by_fkey;
ALTER TABLE content_report ADD CONSTRAINT content_report_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES app_user (id);
