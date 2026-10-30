# Content Engine Import API

The content intelligence engine now has an authenticated persistence boundary:

`POST /api/admin/content-engine/import`

## Security

The endpoint requires the existing `content.create` permission and applies the
existing subject/topic scope checks. It is not a public upload endpoint.

## Input

```json
{
  "publicationId": "pub-example-001",
  "manifestHash": "sha256-of-canonical-manifest",
  "items": [
    {
      "kind": "lesson",
      "content_id": "lesson-001",
      "topic_id": "aptitude.fractions",
      "payload": {
        "title": "Fractions",
        "concept": "...",
        "definition": "...",
        "explanation": "...",
        "examples": [],
        "revisionNotes": [],
        "sourceIds": ["evidence-001"],
        "version": 1
      }
    },
    {
      "kind": "mcq",
      "content_id": "mcq-001",
      "topic_id": "aptitude.fractions",
      "payload": {
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "answerIndex": 1,
        "explanation": "...",
        "difficulty": "easy",
        "sourceIds": ["evidence-001"],
        "version": 1
      }
    }
  ]
}
```

## Persistence behavior

1. Verify the deterministic manifest hash.
2. Reject duplicate publication IDs/manifests.
3. Validate every target topic under the caller's permission scope.
4. Stage lessons in `content_engine_lesson_staging`.
5. Insert MCQs as `DRAFT`.
6. Create one `content_review_batch` per topic.
7. Commit everything in one PostgreSQL transaction.
8. Return review-batch IDs.

Nothing becomes learner-visible at import time.

## Publication lifecycle

```text
ENGINE APPROVED
      ↓
AUTHENTICATED IMPORT
      ↓
IMPORTED / DRAFT
      ↓
EXISTING ADMIN REVIEW
   ↙           ↘
REJECT          APPROVE
  ↓                ↓
ARCHIVED       PUBLISHED
```

The existing review implementation now handles staged lessons as well as
questions/resources. Approving a batch writes the staged lesson into the
existing `lesson` table inside the same transaction as publication of its
questions/resources.

## Idempotency

The publication manifest hash and publication ID are unique. Replaying the
same publication returns `ALREADY_IMPORTED` instead of creating another batch.

## PYQ boundary

The engine is expected to remove PYQs before publication planning. The platform
import endpoint accepts only the engine's approved lesson/MCQ representation;
its normal content source is tagged `content-engine:<publicationId>`. PYQ
content must remain outside this normal learning publication path.
