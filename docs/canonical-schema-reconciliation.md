# NOVA Canonical Schema & Migration Reconciliation

Status: **RECONCILED — PLAN LOCKED, NO DATABASE CHANGES APPLIED**

Date: 2026-10-22

This document records the canonical database contract before integrating the platform and learning worktrees into `main`.

## 1. Current main database

The live development database currently has these public tables:

- `schema_migration`
- `learner`
- `learner_profile`
- `subject`
- `chapter`
- `topic`
- `topic_prerequisite`
- `question`
- `question_attempt`
- `learner_topic_state`
- `learning_event`
- `revision_schedule`
- `ai_interaction`
- `test`
- `test_question`
- `test_answer`
- `app_user`
- `user_session`

Applied migration history is exactly `V1__init` through `V6__users_auth`.

## 2. Canonical identity

`app_user` + `user_session` is the only authentication model.

`account` + `session` from the platform worktree is **rejected** and must not be migrated.

Canonical ownership:

```text
app_user.id = learner.id
        |
        +--> learner-owned learning records
```

All authenticated learning APIs must derive `learner_id` from the authenticated session. Client-supplied learner IDs and hard-coded learner constants are not ownership sources.

## 3. Canonical mastery

`learner_topic_state` remains the single source of truth for topic mastery.

No second `mastery` table is introduced.

Learning services may calculate derived decisions, but persisted mastery remains in `learner_topic_state`.

## 4. Canonical content hierarchy

```text
subject
  -> chapter
    -> topic
      -> question
      -> lesson
      -> topic_resource
      -> content
      -> generated_question
```

Existing `question` and `lesson` remain first-class shipped entities.

The generic `content` / `content_lesson` model is additive and is used for the future document/content lifecycle rather than replacing the existing question bank immediately.

## 5. Canonical assessment model

Existing weekly-test tables remain temporarily:

```text
test
  -> test_question
  -> test_answer
```

The new generic assessment model is additive:

```text
assessment
  -> assessment_question
  -> assessment_answer
```

`assessment` becomes the forward-looking model for diagnostic, foundation, mini, adaptive and eventually reconciled weekly assessments.

No destructive migration of `test` occurs in this phase.

## 6. Canonical learning execution

```text
question_attempt
      |
      +--> learning_session (nullable link)
      |
      v
learner_topic_state
      |
      v
adaptive decision
      |
      +--> recommendation
      +--> intervention
      +--> readiness_snapshot
```

`learning_session` and `question_attempt.session_id` are additive and nullable so existing flows remain valid.

## 7. Canonical AI ownership

`ai_interaction` remains the AI interaction ledger.

The learning branch's `intervention_id` is accepted as an additive FK.

Personalized AI cache/storage must use learner-scoped keys whenever the prompt or result contains learner-specific state.

Safe personalized cache shape:

```text
learner_id + question_id + interaction_type
```

or, for topic-level interactions:

```text
learner_id + topic_id + interaction_type
```

Generic non-personalized knowledge may use a shared cache.

## 8. Canonical RBAC

The platform worktree's granular roles are retained conceptually but adapted away from `account`.

Recommended model:

```text
app_user
  -> broad platform role
  -> granular admin role / permission
  -> optional subject scope
```

Subject scoping references `app_user.id`, not `account.id`.

The platform worktree's `account.admin_role` column is therefore **not copied directly**.

## 9. Canonical content ingestion

The content pipeline is additive and must support both AI and manual paths:

```text
upload
  -> extract
  -> classify
  -> existing topic OR new topic draft
  -> MCQ / study material / lesson
  -> validation
  -> human review
  -> publish
```

Manual creation/editing remains available when extraction/classification is incomplete.

## 10. Accepted additive platform tables

These are approved for eventual migration, subject to final SQL review:

- `achievement`
- `learner_achievement`
- `fcm_token`
- `push_subscription`
- `topic_resource`
- `lesson`
- `test_template`
- `test_template_topic`
- `quicklab_mode`
- `proctoring_session`
- `proctoring_event`
- `question_bookmark`
- `content_review_batch`
- `content_report`
- bulk content-processing tables, after ownership FK adaptation

## 11. Accepted learning tables

- `content`
- `content_lesson`
- `assessment`
- `assessment_question`
- `assessment_answer`
- `learning_session`
- `intervention`
- `milestone_achievement`
- `game_definition`
- `game_session`
- `game_question`
- `game_attempt`
- `generated_question`
- `recommendation`
- `readiness_snapshot`
- `ai_evaluation_run`

## 12. Accepted additive columns

After dependency ordering is resolved:

- `learner_profile.notify_email`
- `learner_profile.notify_whatsapp`
- `learner_profile.onboarded`
- `learner_topic_state.concept_score`
- `question.image_data`
- `question.subtopic`
- `question.paper`
- `question.question_number`
- `question.source_page`
- `question.content_version`
- `question.content_id`
- `question_attempt.session_id`
- `question_attempt.hint_used`
- `test.template_id`
- `topic_resource.image_data`
- `lesson.definition`
- `lesson.formulas`
- `lesson.shortcuts`
- `lesson.common_mistakes`
- `assessment.question_count`
- `assessment.score`
- `assessment.completed_at`
- `ai_interaction.intervention_id`
- `intervention.learner_state_snapshot`

All existing columns remain intact.

## 13. Migration collision resolution

Current `main` ends at V6. The worktrees reuse V6/V7/V8 for incompatible concepts, so their filenames cannot be copied.

The canonical migration sequence must therefore be newly numbered after V6.

Proposed logical order:

```text
V7   push subscriptions
V8   notification preferences
V9   AI interaction type extensions
V10  achievements + FCM tokens
V11  topic resources
V12  question/topic-resource images
V13  lesson extensions
V14  test templates
V15  quick lab
V16  proctoring
V17  onboarding
V18  bookmarks
V19  question/content intelligence extensions
V20  content review/reporting
V21  canonical RBAC + subject scope
V22  asynchronous content-processing jobs
V23  generic content + assessment + learning sessions
V24  assessment questions/answers + attempt hint tracking
V25  interventions
V26  milestone achievements
V27  game engine
V28  PYQ intelligence + generated questions
V29  adaptive assessment + recommendations
V30  exam readiness
V31  AI tutor extensions
V32  AI adaptation/evaluation
```

These numbers are **logical target versions**, not files to apply yet. The final SQL must be generated only after every FK dependency and existing-data compatibility check passes.

## 14. Explicitly rejected structures

Do not migrate:

- `account`
- `session`
- `account.admin_role`
- any duplicate learner identity table
- any duplicate mastery table
- any replacement of `question`
- any immediate replacement of `test`
- any AI cache that is globally keyed while containing learner-specific context

## 15. Foreign-key ownership rule

Every learner-specific table must ultimately reference `learner.id`.

Admin/content permissions reference `app_user.id`.

Content hierarchy references `subject/chapter/topic`.

No learner data may be owned by an email, session token, `account.id`, or client-generated identity.

## 16. Service/repository target

New functionality follows:

```text
API
  -> service
    -> repository
      -> PostgreSQL
```

Services receive canonical `learnerId` and never resolve identity from legacy global constants.

## 17. Integration gate

No worktree code should be merged until all of these pass:

1. canonical migrations are generated
2. migrations apply to a clean database
3. migrations apply to a copy of the current V6 database
4. schema diff shows only approved additions
5. FK graph has no unresolved dependency
6. duplicate columns/constraints are absent
7. learner ownership audit passes
8. AI isolation audit passes
9. existing unit tests pass
10. content validation passes
11. DB seed passes
12. application build passes
13. web API contracts remain compatible
14. Android consumes the same API contracts

## 18. Canonical SQL generation and validation

The collision-free canonical migration set has now been generated in `db/migrations/` as V7 through V32. The source worktrees were not merged; only the approved SQL concepts were adapted into the canonical contract.

Important adaptations:

- `account` / `session` were excluded completely.
- RBAC was rewritten to use `app_user.id` and `admin_subject_scope.user_id`.
- Bulk content-processing ownership was rewritten from `account.id` to `app_user.id`.
- Content-report review ownership was rewritten to `app_user.id`.
- Lesson creation and lesson enrichment were combined in the canonical order.
- PYQ-specific provenance was deferred until V28 so generic question metadata lands first.
- Existing `test` remains untouched; generic `assessment` is additive.

Validation completed:

1. Canonical migration directory contains exactly V1 through V32 with no duplicate version numbers.
2. Static duplicate-column scan found zero duplicate `ADD COLUMN` operations.
3. All V1–V32 migrations were executed inside a transaction using an isolated schema and rolled back successfully.
4. V7–V32 were executed inside a transaction against the actual current V6 database schema/data and rolled back successfully.
5. No persistent schema changes were left by either validation run.

## 19. Current decision

**Canonical SQL has been generated and validated transactionally. No migration has been applied to the real application schema.**

The existing prototype and its current database remain unchanged by the reconciliation. The next gate is a schema-diff/ownership audit followed by service/repository integration; only after those pass should the canonical migrations be committed as the platform's migration history.
