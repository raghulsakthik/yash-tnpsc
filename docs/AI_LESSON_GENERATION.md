# AI lesson generation

## Purpose

The Content Engine can generate one syllabus-topic lesson and 3–10 original four-option MCQs from approved, non-PYQ study material. It does not publish content. Output is imported into the existing content review queue and requires an authorised human decision.

## Required configuration

Set `GEMINI_API_KEY` as a server-side secret in local `.env.local` or the deployment environment. Do not expose it through a `NEXT_PUBLIC_*` variable, commit it, or paste it into chat. The current provider adapter uses the configured Gemini model in `src/lib/ai/provider.mjs`.

The API also requires the platform database and migrations through V71. The local sample `.env.local` currently points to PostgreSQL at `localhost:5432`; start the database and run the normal migration/seed workflow before using the feature.

## Source eligibility

Only published `topic_resource` rows with a matching `content_lineage` record are eligible. The source must:
- map to the selected syllabus topic;
- be in PUBLISHED status;
- have no PYQ year, exam code, exam group, or paper metadata;
- not have a filename indicating a previous-year paper, question paper, or question booklet;
- contain at least 80 characters of extracted text.

Resources without auditable lineage are deliberately excluded. Approve source material through the existing upload/classification/review pipeline first.

## Generation and review flow

1. Open Admin → Content Engine.
2. Select a topic with at least one eligible approved source and choose 3, 5, 8, or 10 MCQs.
3. Generate the lesson and questions. The server uses only the selected topic and eligible source excerpts.
4. Validation requires a complete lesson, worked example, revision notes, four distinct MCQ options, a zero-based answer index, a valid topic/source mapping, and a verbatim source quote for each proposed MCQ answer.
5. The generated manifest is placed in the existing import panel. Import it to create a pending review batch.
6. Open Admin → Review. Preview the questions, lesson and source evidence. AI-suggested options are not highlighted as verified answers.
7. An authorised reviewer must expand the preview and explicitly confirm human verification. The API enforces this confirmation; a client-side checkbox alone is not trusted.
8. Approval publishes through the existing review transaction and immutable lesson-version/lineage flow. Rejection archives the staged items.

## Safety properties

- PYQ and official question-paper sources are excluded from generation evidence and blocked by the existing import guard.
- AI answer keys are marked unverified. A verbatim quote is evidence traceability, not proof that the model interpreted the source correctly.
- No content is auto-published.
- The importer rechecks that every AI package source ID still resolves to a published, topic-matched, non-PYQ resource and rechecks each MCQ's quoted evidence.
- Duplicate questions, invalid options, missing sources, unsupported answers, and malformed output fail closed.
- Review permissions are checked separately for question content and lesson/resource content.

## Current deployment status

The code and deterministic tests can be built without the provider key. Actual model generation cannot be exercised until `GEMINI_API_KEY` is configured and PostgreSQL is available. The local environment currently has no Gemini key configured and PostgreSQL is not responding on port 5432. No AI content has been generated or published as part of this implementation.
