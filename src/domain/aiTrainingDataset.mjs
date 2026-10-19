/**
 * Phase 29.2 — AI Training Dataset. Pure shaping over real, validated rows
 * the repository layer fetched — every example traces back to a real
 * question, a real PYQ, a real evaluated intervention, or a real
 * misconception rule (mistakes.mjs, unchanged). The brief's own
 * instruction — "do not blindly train on raw AI conversations" — is
 * honored structurally: nothing here reads from ai_interaction at all.
 */

/** Question -> Correct explanation (real, authored). */
export function buildExplanationExamples(questions) {
  return questions.map((q) => ({ type: 'QUESTION_EXPLANATION', questionId: q.id, prompt: q.prompt, completion: q.explanation }));
}

/** Question -> Hint (the real authored trap, reframed as a hint). */
export function buildHintExamples(questions) {
  return questions.filter((q) => q.trap).map((q) => ({ type: 'QUESTION_HINT', questionId: q.id, prompt: q.prompt, completion: q.trap }));
}

/** Wrong answer -> Why it is wrong (same real trap, framed as the wrong-answer explanation). */
export function buildWrongAnswerExamples(questions) {
  return questions
    .filter((q) => q.trap)
    .map((q) => ({ type: 'WRONG_ANSWER_EXPLANATION', questionId: q.id, prompt: `Why is a tempting wrong answer to "${q.prompt}" wrong?`, completion: q.trap }));
}

/** Topic -> Simple explanation, built from a real, representative easy question's own real explanation. */
export function buildTopicExplanationExamples(topicsWithSampleQuestion) {
  return topicsWithSampleQuestion
    .filter((t) => t.sampleExplanation)
    .map((t) => ({ type: 'TOPIC_EXPLANATION', topicId: t.topicId, prompt: `Explain ${t.topicName} simply.`, completion: t.sampleExplanation }));
}

/** Topic -> Prerequisite explanation, from the real, seeded topic_prerequisite graph. */
export function buildPrerequisiteExplanationExamples(prerequisiteEdges) {
  return prerequisiteEdges.map((e) => ({
    type: 'TOPIC_PREREQUISITE',
    topicId: e.topicId,
    prompt: `Why does ${e.topicName} require ${e.prerequisiteTopicName} first?`,
    completion: `${e.topicName} builds directly on ${e.prerequisiteTopicName} (real, authored dependency strength ${e.strength}).`,
  }));
}

/** PYQ -> Solving strategy, from a real past-paper question's own real explanation. */
export function buildPyqStrategyExamples(pyqQuestions) {
  return pyqQuestions.map((q) => ({ type: 'PYQ_STRATEGY', questionId: q.id, source: q.source, prompt: q.prompt, completion: q.explanation }));
}

/** Mistake -> Targeted intervention, from a real, evaluated Phase 14 intervention that genuinely improved mastery. */
export function buildMistakeInterventionExamples(evaluatedInterventions) {
  return evaluatedInterventions
    .filter((i) => i.learningGain !== null && i.learningGain > 0)
    .map((i) => ({
      type: 'MISTAKE_INTERVENTION',
      topicId: i.topicId,
      prompt: `What helped on ${i.topicId} after a real learning gap?`,
      completion: `${i.interventionType} (real, measured gain of ${i.learningGain.toFixed(3)} in mastery).`,
    }));
}

/**
 * @param {object} sources every real, fetched source list
 */
export function buildTrainingDataset(sources) {
  const examples = [
    ...buildExplanationExamples(sources.questions ?? []),
    ...buildHintExamples(sources.questions ?? []),
    ...buildWrongAnswerExamples(sources.questions ?? []),
    ...buildTopicExplanationExamples(sources.topicsWithSampleQuestion ?? []),
    ...buildPrerequisiteExplanationExamples(sources.prerequisiteEdges ?? []),
    ...buildPyqStrategyExamples(sources.pyqQuestions ?? []),
    ...buildMistakeInterventionExamples(sources.evaluatedInterventions ?? []),
  ];
  const byType = {};
  for (const e of examples) byType[e.type] = (byType[e.type] ?? 0) + 1;
  return { totalExamples: examples.length, byType, examples };
}
