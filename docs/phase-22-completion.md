# Phase 22 Completion Report — Subject-Specific Game Engine

## What was genuinely missing

No game infrastructure existed at all — Phase 16's weekly plan explicitly, honestly placeholders Friday as `GAME`/`available: false` with the stated reason "no game engine exists yet." This phase builds the real thing: one configuration-driven engine, not a system per game, with results feeding the learner model exactly like every other activity type already does.

## What was implemented

**Migration** (`db/migrations/V11__game_engine.sql`): four new tables — `game_definition` (the configuration: `target_topic_ids`, a difficulty band, `question_count`, `time_limit_seconds`, `scoring_config`, `mechanics`), `game_session`, `game_question`, `game_attempt`. Two real, illustrative definitions are seeded directly in the migration — `speed-round-aptitude` and `speed-round-reasoning` — with their topic lists resolved via `SELECT array_agg(id) FROM topic WHERE chapter_id = ...` against the real seeded syllabus, not hardcoded, so they stay correct if the syllabus changes.

**New pure domain module** (`src/domain/gameEngine.mjs`): `scoreGameAttempt()` and `scoreGameSession()` — the one mechanic this phase implements, "Speed Round": a base score per correct answer, a speed bonus for beating the question's own `estimated_seconds`, and a capped streak bonus for consecutive correct answers. **Correctness is never computed here** — it comes from `recordAttempt()`, unchanged; this module only turns an already-graded result into points.

**New repository and service** (`src/repository/gameRepository.mjs`, `src/services/gameService.mjs`): `startGame()` reuses `pickTopicQuestions()` (`testGen.mjs`, unchanged) to draw a question set from a definition's configured topics/difficulty band. `submitGame()` is the one piece that matters most: it loops over every answered question and calls `recordAttempt()` — the exact same shared pipeline practice, revision, the weekly test, the Default Assessment, and PYQ practice all already use — with `mode: 'GAME'`. Scoring happens *after* that grading, on top of it, never instead of it.

**Five new routes**: `GET /api/games/definitions`, `POST /api/games` (start/resume), `GET /api/games/:id`, `POST /api/games/:id/answers`, `POST /api/games/:id/submit`.

## Verification performed

**Unit tests** (6 new, `tests/game-engine.test.mjs`): a wrong answer earns nothing and resets the streak; a correct answer on pace earns base-plus-first-streak-bonus (my own first draft of this assertion forgot to include the streak bonus its own comment named — caught and fixed before trusting the suite, not silently adjusted to match a wrong number); a faster correct answer earns strictly more than a slower one; the streak bonus grows then caps exactly at the configured ceiling after 20 consecutive correct answers; a full session correctly tracks the streak as a running sequence, not per-question in isolation (a broken streak produces a smaller bonus on the next correct answer); an empty session scores zero, not a crash. 184/184 total unit tests pass (178 existing + 6 new).

**DB-backed exit test** (`tests/game-engine.smoke.mjs`, `npm run test:game-engine`, 10 checks, all passing on the first run) — the real proof that results feed the learner model, not a separate system: a real session is drawn from the real `speed-round-aptitude` definition; starting again resumes the same session rather than duplicating it; one deliberately wrong, rest fast-and-correct answers produce the expected correct count and a real positive score; every graded question wrote a real `question_attempt` row; real `learner_topic_state` and `revision_schedule` rows were created, indistinguishable in storage from any other practice attempt; the completed session reveals answer keys and points; answering or resubmitting a finished game is refused.

**Live verification through the browser**: `GET /api/games/definitions` and `POST /api/games` against the real, currently-fresh seeded learner correctly returned both real definitions (topic lists resolved from the real seeded syllabus) and started a genuine 8-question Reasoning Speed Round session on the first live call.

**Full regression + build**: `npm test` (184/184) → `npm run db:migrate` (V11 applied, including the two seeded definitions) → `npm run test:game-engine` (10/10) → all 17 prior DB-backed smoke suites (rerun in full, unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 5 new routes).

## Known limitations

- **Phase 16's weekly plan was not updated to point at this engine.** Its Friday `GAME` day still honestly reports "no game engine exists yet," because that's still true from the weekly plan's own point of view — nothing wires the two together. This is the one existing phase whose documented limitation this phase could have closed but deliberately didn't, to avoid touching Phase 16's working, tested code without being asked; wiring them together is natural, scoped follow-up.
- **Only one mechanic exists** (`SPEED_ROUND`) — the brief's `mechanics` field in `GameDefinition` anticipates more, but only one is implemented. Adding a second (e.g. a matching or elimination mechanic) would need new scoring logic in `gameEngine.mjs`, not a new table or a new game-specific system, which is the entire point of the configuration-driven design.
- **No frontend exists to render a game** — consistent with every other content-and-UI gap this project has named honestly since Phase 2; the backend capability is real and tested, there's nothing yet for a learner to actually click through.
- **Novelty (avoiding recently-seen questions) isn't factored into game question selection** — `pickTopicQuestions()` is called with an empty seen-set every time, a deliberate simplification for a short, replayable session type, not an oversight.

## Algorithm/version changes

No existing function was modified. `recordAttempt()`, `pickTopicQuestions()` (both unchanged) are reused exactly as every other activity type already uses them. One new migration, one new domain module, one new repository, one new service, five new routes — all additive.

## Stop

Per the agent procedure, this is where Phase 22 stops.
