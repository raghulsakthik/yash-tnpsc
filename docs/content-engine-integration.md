# Content Intelligence Engine Integration

The TNPSC platform is the runtime learner application; the separate
`tnpsc-content-intelligence-engine` repository is the source-processing and
content-quality system.

## Verified platform surface

The platform already contains admin content APIs for classification, processing,
review, lessons, questions, resources, curriculum and tests. The content-engine
migration also adds richer question metadata and review batches.

The safe production flow is:

```text
Content Intelligence Engine
  -> approved version
  -> deterministic publication manifest
  -> authenticated admin/platform boundary
  -> DRAFT platform rows
  -> existing review queue
  -> admin approval
  -> PUBLISHED content
  -> learner APIs/frontend
```

## Important compatibility constraint

The current platform `lesson` table is keyed by `topic_id`, so it represents one
primary lesson per topic. The intelligence engine can produce multiple lessons
per topic. Until the platform lesson model is expanded, multiple approved
lessons for one topic must be sent to review rather than silently overwritten.

## PYQ policy

PYQs are not normal generated learning content. The intelligence engine has a
hard PYQ exclusion, and the platform import boundary must enforce the same rule.
A publication manifest containing blocked PYQ material must not be published.

## Provenance

Every imported MCQ must retain its source evidence/reference and publication
manifest identity. The platform must be able to answer:

- which engine content version created this row;
- which source evidence supports it;
- which curriculum topic owns it;
- which publication manifest imported it;
- which reviewer approved it.

## No public ingestion endpoint

The engine-to-platform importer must be authenticated and protected by the
existing admin content permission model. It must never become an anonymous
content-upload API.

## Next implementation target

Implement the authenticated persistence adapter inside this repository using
the existing `adminContent`/review infrastructure and a transaction. The
frontend should not need a redesign: it should consume the same question,
lesson, course and test APIs after approved content is published.
