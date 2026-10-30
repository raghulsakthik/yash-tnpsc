# Phase 29 — Learner Visibility & Admin Audit

## Objective

Make the engine-to-platform lifecycle observable without changing the existing learner UI or learner query contract.

## Learner visibility contract

The existing `lesson` row remains the learner-facing source of truth. Engine candidates, rejected versions and superseded snapshots are never served directly to learners.

Approved engine content replaces the live lesson only inside the authenticated admin review transaction. Rollback restores a previously approved snapshot into the same live row.

## Admin version history

`GET /api/admin/content-engine/versions?topicId=<topic>` returns all immutable engine lesson snapshots for the topic, newest first.

Each record includes:

- publication ID
- engine content ID
- version number
- lesson snapshot
- source IDs
- engine version
- review batch
- publication/superseded/rollback timestamps
- reviewer identity
- lifecycle status

## Audit history

Migration `V25__content_engine_audit.sql` adds an append-only `content_engine_audit` table.

`GET /api/admin/content-engine/audit?topicId=<topic>` exposes scoped history to authorized admins.

Rollback actions are explicitly recorded as `ROLLED_BACK` events with actor and target version metadata.

## Security

- Existing admin authentication is required.
- Existing content permission is required.
- Existing topic-scope authorization is enforced.
- Audit records are read-only through the admin API.
- Learner APIs do not receive pending/rejected engine snapshots.

## Compatibility

No learner-facing route or UI contract is changed. The version and audit layers are additive and preserve the current `lesson(topic_id)` serving model.
