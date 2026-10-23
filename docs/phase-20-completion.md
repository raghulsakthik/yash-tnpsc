# Phase 20 Completion Report — Multi-Subject Domain Expansion

## What this phase could honestly do, and what it couldn't

The brief's architecture diagram names Mathematics/Reasoning/Languages/Polity/Social Science/Current Affairs, and its instruction is explicit: "don't create separate systems for every subject... only subject-specific rules/configuration change." Two things were true before writing anything, checked against the real repository rather than assumed:

1. **The subject/chapter/topic/question model has been fully generic since V1.** Nothing in the schema, the content pipeline, the adaptive engine, the mistake classifier, or the revision scheduler has ever referenced `apt.*` as a hardcoded assumption — the `apt.`/`gs.` prefixes are just content IDs, not special-cased anywhere in code (confirmed by reading every phase's domain/service code built across this entire session — `aptitude.foundation`-specific logic exists only in the *repository queries* that are legitimately scoped to the Default Foundation Test, Phase 3's own stated purpose, not in any reusable engine).
2. **Fabricating what this phase could add would violate the project's own stated principles.** `content/syllabus/prelims-495.yaml` has an explicit comment, unchanged since before this session: "never invent a weight." Current Affairs doesn't exist as a subject in the syllabus at all, and I have no authoritative source for what its real question count or chapter structure should be — inventing one would be exactly the fabrication this project has refused to do everywhere else (no fake PYQ provenance, no invented exam weights, no synthesized past papers). So Current Affairs was **not** added.

What *could* be done honestly: Indian Polity already has 19 real topics defined in the syllabus (from the original, pre-session content), with a real official mark weight (15), but **zero questions** — a pure content gap, not a missing subject. Authoring a small amount of genuinely correct civics content for it and running the existing, completely unchanged engines against it is a real, verifiable proof that "don't create separate systems" is actually true today, not just an aspiration.

## What was implemented

**New content only — zero code changes.** Five new YAML files under `content/questions/polity/` (`constitution-preamble.yaml`, `fundamental-rights.yaml`, `directive-principles.yaml`, `union-executive.yaml`, `judiciary.yaml`), 11 questions total across 5 real, already-defined topics (`polity.constitution-preamble`, `polity.fundamental-rights`, `polity.directive-principles`, `polity.union-executive`, `polity.judiciary`). Every question states a well-established, verifiable constitutional fact (e.g., the 42nd Amendment's Preamble changes, Articles 14–18 as the Right to Equality, Article 131's original jurisdiction) — the same `source: authored` convention every non-PYQ question in the bank already uses, not claimed as a real past paper. Authored in the exact existing YAML schema, validated against the unchanged `scripts/validate-content.mjs`.

## Verification performed

**Content pipeline, unchanged**: `npm run validate:content` accepted the new files immediately (333 questions validated, up from 322, same `content OK`) and `npm run db:seed` loaded them with zero errors (`seeded: ... 333 questions`) — no migration, no script edit, no schema change.

**New DB-backed exit test** (`tests/multi-subject.smoke.mjs`, `npm run test:multi-subject`, 6 checks, all passing on the first run) — the actual proof of genericity, each check naming the exact unchanged engine it exercises:
- The real, seeded Polity questions span more than one topic.
- `allocateSlots()`/`pickTopicQuestions()` — the *exact* weekly-test blueprint allocator (`testGen.mjs`, untouched since before this session) — allocates a real question set from Polity content with no subject-specific branching.
- `recordAttempt()` (unchanged) computes a real `mastery_score` and creates a real spaced-repetition schedule row for a Polity topic, identical to any aptitude topic.
- `classifyTopics()` (Phase 4, unchanged) classifies a deliberately-weak Polity topic as `WEAK`/`CRITICAL`, the same logic path as any aptitude topic.
- `decideNextActionForTopic()` (Phase 11's full Adaptive Decision Engine, unchanged) produces a real, fully-scored 8-candidate decision for a Polity topic — the richest engine in the whole system, running on a subject it was never written with in mind, with zero special-casing.

**Live verification through the browser**: `GET /api/questions/next?topic=polity.fundamental-rights` — the original, Phase-1-era, completely untouched practice route — served a real Polity question correctly on the first live call, difficulty-banded and answer-key-withheld exactly as it already does for every aptitude topic.

**Full regression**: `npm test` (174/174, unchanged — no domain code touched) → `npm run build` (clean, no new routes) → all 14 prior DB-backed smoke suites (`test:aptitude-assessment` through `test:loop`), rerun in full after reseeding with the new content, all still green — proving the new content didn't disturb any existing topic/question-count-sensitive assertion anywhere in the system.

## Known limitations

- **Current Affairs remains entirely unmodeled** — not a subject in the syllabus, no chapters, no topics. This is a real, stated content gap (carried since the very first audit), not fabricated to appear closed.
- **General Studies beyond Indian Polity, and both language papers, remain untranscribed** — the other five GS chapters have no topic breakdown at all, and Tamil/English have zero authored questions. This phase closed a sliver of Polity specifically (5 of its 19 defined topics), as an illustrative proof, not a claim of full General Studies coverage.
- **11 questions is a demonstration sample, not exam coverage.** Polity carries 15 real marks on the paper; 11 authored questions across 5 of 19 topics proves the pipeline works, it doesn't come close to the depth the aptitude bank has (322 questions across 20 topics, built over many prior commits).
- **No PYQ-tagging was added for Polity.** All 11 questions are `source: authored`; none are claimed to come from a real past paper, since that provenance can't be verified here.

## Algorithm/version changes

None. No existing function, repository, service, or route was modified — this phase's entire footprint is five new content files, one new DB-backed test, and its `package.json` script entry.

## Stop

Per the agent procedure, this is where Phase 20 stops.
