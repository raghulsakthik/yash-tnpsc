-- Single-learner auth: a password, set once, gating the one seeded
-- learner's own data behind a session cookie. Not multi-tenant — nothing
-- else about LEARNER_ID or any other table changes.

ALTER TABLE learner ADD COLUMN password_hash TEXT;
