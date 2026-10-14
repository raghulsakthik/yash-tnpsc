# NOVA

A private, personalised practice system for the TNPSC Combined Civil Services
(Preliminary) Examination – II, Code 495. Built for one learner.

Slice 1 proved the complete learning loop on one topic before anything was
built on top of it. The phase on top of that — mastery scoring, spaced
repetition, an on-demand AI tutor, and a daily plan — is now in, still scoped
to what the existing data actually supports.

---

## What works right now

- The prelims syllabus tree (3 subjects, 16 chapters, 40 topics) seeded from
  version-controlled YAML, with each chapter carrying its **real question count**
  from the official paper.
- 121 verified questions across 12 topics — fractions plus the 11 topics that
  chain off it (whole-numbers, division, decimals, percentage, simplification,
  ratio-and-proportion, HCF, LCM, simple interest, compound interest,
  time-and-work) — each with explanations and distractor feedback.
- A practice screen: question, four options, confidence rating, submit.
- An adaptive engine that moves difficulty on recency-weighted accuracy, detects
  a struggle streak, classifies the *kind* of mistake, and walks the prerequisite
  graph to find the root cause.
- A mastery score per topic (concept, accuracy, speed, retention,
  consistency, confidence-calibration), stored as six separate dimensions so
  the weighting can be revisited without losing history.
- Spaced-repetition revision: a topic's first attempt schedules its first
  review a day out; a "Memory Echo" session (`/revision`) advances the
  interval by how well she recalls it — doubles on a clean recall, shrinks
  on a miss, bounded 1–90 days.
- A daily plan (`/`, backed by `/api/plan/today`) — the "Next Best Action":
  revision due today takes priority over new practice, otherwise the
  highest-priority topic by exam weight, weakness and prerequisite urgency.
- An on-demand AI hint on a wrong answer ("Why, exactly?"), cached per
  question, backed by Anthropic — and invisible when no key is configured,
  never blocking or erroring the learning flow.
- Idempotent attempt recording, so a flaky connection cannot double-count.
- 44 unit tests and a DB-backed smoke test covering the adaptive loop,
  mastery scoring and the revision cycle, all green. CI runs all of it
  against a real Postgres service container on every push.

## What is deliberately absent

No journey visualisation, no weekly-test module, no mobile app, no Redis, no
auth, no area/volume/reasoning content yet (no prerequisite edges connect
them to the fractions chain, so they don't exercise the new mechanics — see
the content files for what's authored). Each is an afternoon's work once
there's a reason for it; none of them helps if there isn't yet.

---

## Running it

You need Node 22+ and Docker.

```bash
cp .env.example .env.local        # then edit if you want
docker compose up -d              # Postgres on 5432
npm install
npm run setup                     # migrate, validate content, seed
npm run dev                       # http://localhost:3000
```

`npm run setup` is safe to re-run. Content files are the source of truth; the
database is downstream and disposable.

### Checks

```bash
npm test                 # engine unit tests, no database needed
npm run validate:content # content integrity, runs in CI
npm run test:loop        # the full loop against a real database
```

---

## Decisions worth knowing before you change anything

**Backend is Next.js API routes, not Spring Boot.** The architecture doc
specifies Java 21 + Spring Boot. That is a defensible choice and a CV-relevant
one, but it means three runtimes, two build systems and dual CI for one
developer serving one user. The module boundaries the doc describes
(controller → service → domain → repository) are preserved here; only the
language is different. If you want Spring Boot, the domain modules in
`src/domain/` are pure functions with no framework in them, and they port
directly. **Change this now if you are going to, not in month three.**

**JavaScript, not TypeScript.** One less build step for week 1. Add TypeScript
when the API surface is big enough that you are losing time to shape mistakes.

**Difficulty is a number, 0 to 1.** `EASY`/`MEDIUM`/`HARD` exist only for
display. Adaptation needs the granularity.

**`answer` is an index into `options`, never the text.** Text answers break the
moment you fix a typo in an option.

**Tamil renders from day one.** The font stack leads with Noto Sans Tamil and
every content row carries a `language` column from migration V1. The language
paper is 100 of the 200 prelims questions; retrofitting bilingual content later
is the most expensive mistake available on this project.

**The frontend decides nothing.** It renders the question it is given and posts
the answer. Mastery, difficulty, revision and the daily plan are all computed
server side.

**The AI hint is additive, never load-bearing.** `/api/ai/hint` returns
`{available: false}` on any failure — no key, network error, bad response —
with an ordinary 200, not an error. The deterministic explanation and trap
text are already on screen regardless; losing the AI provider should be
invisible to her. Set `ANTHROPIC_API_KEY` in `.env.local` yourself to turn
it on — it is never asked for or typed into this codebase.

---

## Layout

```
content/
  syllabus/prelims-495.yaml     the authority for the topic tree + exam weights
  questions/aptitude/*.yaml     authored questions; never typed into the database
db/migrations/                  numbered SQL, applied once each, in a transaction
scripts/
  migrate.mjs                   ~60 lines you can read in full
  validate-content.mjs          fails CI on broken content
  seed.mjs                      content/ -> Postgres, idempotent
src/
  domain/                       pure functions, no framework, no database
    accuracy.mjs                recency-weighted accuracy, speed
    difficulty.mjs              the adaptation rules
    selection.mjs               question + topic scoring, prerequisite walk
    mistakes.mjs                mistake classification + deterministic responses
    mastery.mjs                 concept, consistency, confidence-calibration, blended mastery
    revision.mjs                recall performance, interval growth/decay, due check
    planner.mjs                 the daily plan / "Next Best Action"
    ai/context.mjs              compact prompt context + the hint prompt itself
  lib/ai/provider.mjs           the one file that changes for a different AI provider
  app/api/                      questions, attempts, revision, plan, ai/hint
  app/practice/                 the practice screen
  app/revision/                 "Memory Echo" — same screen, sourced from the revision queue
  app/_components/QuestionSession.js  the shared question/answer/feedback state machine
tests/
  engine.test.mjs               44 unit tests
  loop.smoke.mjs                DB-backed: the adaptive loop, mastery, and the revision cycle
```

`src/domain/` is the part worth protecting. It has no imports from Next.js, no
database calls and no I/O, which is why it can be tested exhaustively and why it
would survive a change of backend.

---

## The next three things

1. **Ask her which language paper she is taking.** Tamil or English. It decides
   half the content plan and nothing else should be authored until you know.
2. **Transcribe the remaining syllabus units into topics.** 4 of 23 units are
   split so far; the validator reports coverage on every run. The rest is
   careful reading, not engineering.
3. **Open it on her phone and watch her use it.** Not yours. Fix what breaks,
   then write down every place she hesitated.

---

## Syllabus sources

| Paper | Code | Dated |
| --- | --- | --- |
| Prelims, Group II and IIA (this is what NOVA targets) | 495 | 12.12.2024 |
| Group II Main, General Studies (descriptive — out of scope) | 469 | — |
| Group IIA Main (objective) | 583 | 04.07.2025 |

The Group II main paper is descriptive: 100- and 200-word written answers. The
adaptive engine has no input for that and should not pretend otherwise. NOVA
targets the objective papers. If the written paper is ever added, it needs its
own data model and a human in the scoring loop — not this one.
