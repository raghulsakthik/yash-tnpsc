# Phase 28 — Content Versioning & Rollback

## Goal

Protect the learner-facing lesson while allowing the Content Intelligence Engine to publish newer reviewed versions and safely restore an earlier approved version.

## Lifecycle

```text
Engine v1
  -> import
  -> admin review
  -> approve
  -> lesson version 1 PUBLISHED

Engine v2
  -> import
  -> admin review
  -> approve
  -> lesson version 1 SUPERSEDED
  -> lesson version 2 PUBLISHED

Rollback to v1
  -> restore v1 snapshot into the live lesson row
  -> v2 is no longer the active learner version
  -> v1 becomes PUBLISHED again
```

A rejected candidate never replaces the live lesson.

## Persistence

`content_engine_lesson_version` is an immutable snapshot table containing the learner-visible lesson fields, source evidence, engine version, publication, review batch, version number and review timestamps.

The existing `lesson` table remains the live serving record. This avoids changing existing learner queries while making every approved engine lesson recoverable.

`content_engine_lineage.version_number` connects an engine lesson lineage record to the approved platform version.

## Approval rules

- The first approved engine lesson for a topic becomes version `1`.
- Each subsequent approved engine lesson increments the topic version.
- Only one version for a topic can be `PUBLISHED`.
- Approving v2 supersedes v1; it does not destroy v1.
- Source IDs and engine version remain attached to every version.
- PYQ protection and existing admin review gates remain unchanged.

## Rollback API

`POST /api/admin/content-engine/rollback`

Request:

```json
{
  "topicId": "aptitude.ratio-and-proportion",
  "versionNumber": 1
}
```

The endpoint requires the existing `CONTENT_CREATE` permission and topic scope. It runs the restore and lineage update in one database transaction.

## Safety properties

1. A pending/rejected version cannot become learner-visible through normal review approval.
2. Rollback does not delete the newer version.
3. The restored version keeps its original source evidence.
4. The learner-facing `lesson` record is restored atomically.
5. Existing learner APIs continue reading the live `lesson` record.
6. Version history survives so an administrator can audit which engine publication produced each approved lesson.

## Verification

The Phase 28 E2E flow verifies:

- v1 import and approval
- v1 is live
- v2 import and approval
- v1 becomes `SUPERSEDED`
- v2 becomes `PUBLISHED`
- live lesson changes to v2
- rollback to v1 restores the exact v1 lesson title/content snapshot
- v1 becomes `PUBLISHED` again
- v2 is no longer active
- a later rejected candidate leaves v1 live

This is implemented in `scripts/content-engine-review-e2e.mjs` and runs through the real authenticated HTTP review and rollback endpoints against the disposable PostgreSQL test database.
