# NOVA Recommendation + Intervention Integration

## Purpose

Adaptive decisions are now persisted as learner-owned recommendations. A learner can accept or dismiss a recommendation. Accepting creates an intervention with a baseline snapshot. The next committed attempt on the same topic evaluates the active intervention against the updated learner state.

## Lifecycle

```text
adaptive decision
      |
      v
recommendation (PENDING)
      |
      +---- dismiss ---> DISMISSED
      |
      +---- accept ---> ACCEPTED
                         |
                         v
                  intervention (ACTIVE)
                         |
                  learner attempts
                         |
                         v
                  intervention (EVALUATED)
                         |
                  learning_gain
                  retention_gain
```

## Ownership

Every recommendation and intervention is scoped to `learner_id`, which is resolved from the authenticated `app_user.id`. Client-supplied learner IDs are never trusted.

## Failure isolation

- Grading is committed before intervention evaluation.
- Intervention evaluation is best-effort and cannot invalidate a recorded answer.
- Recommendation creation is independent from the existing question grading path.
- The existing `question_attempt` and `learner_topic_state` pipeline remains authoritative.

## APIs

- `GET /api/learning/recommendations`
- `POST /api/learning/recommendations` with `{ "topicId": "..." }`
- `POST /api/learning/recommendations/:id` with `{}` to accept
- `POST /api/learning/recommendations/:id` with `{ "action": "DISMISS" }` to dismiss
- `GET /api/learning/next-action?topic=...` remains the non-persistent decision endpoint.

## Migration gate

The repository/service layer expects the canonical V29 `recommendation` and V25 `intervention` tables. The canonical V7-V33 migration chain must be applied before these persistence endpoints are exercised against a fresh database.
