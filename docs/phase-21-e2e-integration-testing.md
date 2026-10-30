# Phase 21 — End-to-End Content Engine Integration Testing

## Objective

Verify that approved content produced by the TNPSC Content Intelligence Engine can cross the platform boundary without manifest drift, unsafe content, duplicate replay, or bypassing admin review.

## Contract covered

`content-engine -> POST /api/admin/content-engine/import -> content_review_batch -> admin approval -> learner content`

### Controls

- Canonical SHA-256 manifest hashing is shared across Python and Node.js.
- Object keys are recursively sorted before JSON serialization, so insertion order cannot change the manifest hash.
- The engine emits only approved lesson/MCQ content at the import boundary.
- PYQs are hard-blocked by the engine boundary.
- Missing evidence/provenance is rejected before publication.
- Multiple approved lessons for one platform topic require review because the platform `lesson` model has one primary lesson per topic.
- The platform import remains authenticated through `content.create` and topic-scope authorization.
- Imported questions remain `DRAFT` and lessons remain staged until the existing admin review flow approves them.
- Publication ID and manifest hash provide replay/idempotency protection.

## Test fixture

Publication `phase21-fixture` has one lesson and one MCQ. Its expected manifest SHA-256 is:

`58fb9c7e0bf727fb42df5cd4470353570b6c3c48a946db7d9c9f4e686ef01ceb`

The same fixture is asserted by the Python engine test and the Node platform smoke test.

## Required end-to-end verification

1. Generate an approved engine import plan.
2. POST the exact `publicationId`, `items`, and `manifestHash` to the authenticated import endpoint.
3. Confirm `201` and `IMPORTED_PENDING_REVIEW`.
4. Confirm one review batch per affected topic.
5. Confirm replay returns `ALREADY_IMPORTED` rather than duplicating content.
6. Change one payload field without changing the supplied hash and confirm `MANIFEST_HASH_MISMATCH`.
7. Attempt an unauthorized topic and confirm `FORBIDDEN_TOPIC`.
8. Attempt PYQ/missing-provenance/invalid-answer content and confirm rejection before learner publication.
9. Approve the review batch through the existing content-review workflow.
10. Confirm the approved lesson is materialized into the platform lesson table and questions become learner-eligible.
11. Confirm audit/review state records the approval actor and publication lineage.

## Status

The cross-language manifest contract and deterministic fixture are implemented. Runtime database/API execution still requires the deployed application environment with valid PostgreSQL/authentication data; GitHub repository access alone cannot truthfully claim that live API execution has passed.
