// Phase 26.5 — InspiredQuestionService. Lists published, AI-generated
// TNPSC-inspired MCQs — distinct from real PYQs by construction (a
// separate table, generatedQuestionRepository.mjs). Honestly empty: no AI
// provider is configured in this environment (see completion report), so
// nothing has ever been generated, validated or published.
import { findPublishedGeneratedQuestions } from '../repository/generatedQuestionRepository.mjs';

export async function listInspiredQuestions() {
  const questions = await findPublishedGeneratedQuestions();
  return {
    questions,
    note:
      questions.length === 0
        ? 'no TNPSC-inspired questions have been generated yet — this environment has no AI provider configured; the storage, provenance and review pipeline is built and ready for one'
        : null,
  };
}
