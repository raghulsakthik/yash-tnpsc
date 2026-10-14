/**
 * Builds the compact context sent to the AI provider. Only what the model
 * needs, never more — see the master doc's "AI context builder": full
 * attempt history or raw database rows never go in a prompt.
 */

/**
 * @param {object} input
 * @param {string} input.learnerName
 * @param {string} input.topicName
 * @param {string} input.question
 * @param {Array<string>} input.options
 * @param {number} input.correctIndex
 * @param {number|null} input.selectedIndex
 * @param {string} input.explanation the deterministic explanation already shown
 * @param {string|null} input.mistakeType
 * @param {number} input.masteryScore 0..1
 * @returns {object} compact context object
 */
export function buildHintContext({
  learnerName,
  topicName,
  question,
  options,
  correctIndex,
  selectedIndex,
  explanation,
  mistakeType,
  masteryScore,
}) {
  return {
    learner: learnerName,
    topic: topicName,
    question,
    correctAnswer: options[correctIndex],
    herAnswer: selectedIndex === null || selectedIndex === undefined ? null : options[selectedIndex],
    alreadyShownExplanation: explanation,
    mistakeType,
    masteryPercent: Math.round(clamp01(masteryScore) * 100),
  };
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * System + task prompt. Kept short and constrained on purpose — see the
 * master doc's "AI prompt architecture" and "AI safety": concise, does not
 * just repeat what's already on screen, never invents a fact, ends with a
 * small question so it reads as tutoring rather than an answer dump.
 *
 * @param {object} context from buildHintContext
 * @returns {{system: string, user: string}}
 */
export function buildHintPrompt(context) {
  const system = [
    'You are a patient, encouraging tutor helping a student preparing for the',
    'TNPSC (Tamil Nadu Public Service Commission) exam with a school-level',
    'arithmetic question she just answered incorrectly.',
    'She has already been shown a worked explanation and a note on the trap',
    'in the wrong answer — do not repeat those, add a different angle: a',
    'short mnemonic, an analogy, or the one habit that would have caught it.',
    'Stay under 60 words. End with one short check-in question. Never invent',
    'facts about the exam itself; this question is pure arithmetic.',
  ].join(' ');

  const user = JSON.stringify(context, null, 2);

  return { system, user };
}
