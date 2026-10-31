-- Production's content_processing_batch.created_by FK had drifted to
-- reference a vestigial `account` table (a Better-Auth-shaped table with
-- columns like accountId/providerId/accessToken/userId -- leftover from
-- an abandoned auth-library experiment, never created by any migration in
-- this repo, holding 3 unrelated rows) instead of app_user, the real
-- identity table every other part of this app uses. Confirmed via direct
-- inspection: this repo's own migration history never created or
-- referenced `account` at all, so the drift happened out-of-band.
--
-- Effect of the drift: every real admin (whose id only ever exists in
-- app_user) failed this FK, so every content-processing batch insert
-- failed -- the entire Bulk Upload / retrieval analysis feature has
-- never worked in production. Confirmed zero existing rows in
-- content_processing_batch before this fix, so there's no data to
-- reconcile -- this is a pure schema repair.
--
-- Idempotent: on a database where the FK was never drifted (every fresh
-- migration run, e.g. CI/disposable databases), this drops and
-- recreates the already-correct constraint, a no-op in effect.
ALTER TABLE content_processing_batch
    DROP CONSTRAINT IF EXISTS content_processing_batch_created_by_fkey,
    ADD CONSTRAINT content_processing_batch_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES app_user (id);
