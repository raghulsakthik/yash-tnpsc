# NOVA Canonical Integration Gate

## Status

The canonical schema has passed the database compatibility gate. No V7+ migration has been applied to the live application schema.

## Completed checks

- Canonical migrations: V1–V33, with no duplicate table creation.
- V7–V33 executed transactionally against the current V6 schema/data and rolled back successfully.
- V7–V33 executed as one clean transactional chain and rolled back successfully.
- Existing unit tests: 50/50 passing.
- Production build: passing.
- Authenticated learner routes use `requireUser()` before reading `user.id`.
- No production `LEARNER_ID` usage remains in `src`; the legacy constant is retained only in `src/lib/db.mjs` for seed/bootstrap compatibility and must not be used by request handlers.
- AI hint cache is learner-scoped.
- Production middleware no longer redirects missing sessions to the development-session endpoint.

## Canonical ownership

`app_user.id` is the authenticated identity and equals `learner.id`. Learning records remain owned by `learner.id`. Admin subject scope is owned by `app_user.id`.

## AI privacy

Personalized AI responses use learner-scoped cache keys:

- `(learner_id, question_id, type)` for question-level interactions
- `(learner_id, topic_id, type)` for topic-level interactions

The legacy global AI cache indexes are removed by V33.

## Remaining gate

The migrations are intentionally still unapplied. The next integration phase is service/repository adoption and API contract migration, followed by a full end-to-end web/Android parity audit.
