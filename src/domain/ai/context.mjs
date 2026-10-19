/**
 * Builds the compact context sent to the AI provider. Only what the model
 * needs, never more — see the master doc's "AI context builder": full
 * attempt history or raw database rows never go in a prompt. Every field
 * is named for exactly what it means (no bare numbers without a label) so
 * the model -- and anyone reading a logged prompt later -- knows what
 * each one is without guessing.
 *
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
 * @param {number} input.attemptCountOnTopic how many questions on this topic she's answered, ever
 * @param {number|null} input.recentAccuracyOnTopic 0..1 over her last ~10 attempts on this topic, or null if too few
 * @param {number|null} input.priorMissesOnThisQuestion how many times she's gotten this exact question wrong before
 * @param {number|null} input.confidenceLevel 1..5 self-rated confidence before seeing the result, or null if not given
 * @param {boolean|null} input.tookLongerThanExpected whether her time on this question exceeded its estimated time
 * @returns {object} compact, fully-labeled context object
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
  attemptCountOnTopic = 0,
  recentAccuracyOnTopic = null,
  priorMissesOnThisQuestion = null,
  confidenceLevel = null,
  tookLongerThanExpected = null,
}) {
  return {
    learnerName,
    topicName,
    question,
    correctAnswer: options[correctIndex],
    herAnswer: selectedIndex === null || selectedIndex === undefined ? null : options[selectedIndex],
    wasCorrect: selectedIndex === correctIndex,
    alreadyShownExplanation: explanation,
    mistakeType,
    masteryPercentOnTopic: Math.round(clamp01(masteryScore) * 100),
    attemptCountOnTopic,
    recentAccuracyPercentOnTopic: recentAccuracyOnTopic === null ? null : Math.round(clamp01(recentAccuracyOnTopic) * 100),
    priorMissesOnThisExactQuestion: priorMissesOnThisQuestion,
    selfRatedConfidenceBeforeAnswering: confidenceLevel,
    overconfident: confidenceLevel !== null && confidenceLevel >= 4 && selectedIndex !== correctIndex,
    underconfidentDespiteCorrect: confidenceLevel !== null && confidenceLevel <= 2 && selectedIndex === correctIndex,
    tookLongerThanExpected,
  };
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * System + task prompt for a wrong-answer rescue. Kept short and
 * constrained on purpose — see the master doc's "AI prompt architecture"
 * and "AI safety": concise, does not just repeat what's already on
 * screen, never invents a fact, ends with a small question so it reads as
 * tutoring rather than an answer dump. Now also reacts to the richer
 * signals in the context (repeated misses, overconfidence, slow correct
 * answers) instead of only the single question in isolation.
 *
 * @param {object} context from buildHintContext
 * @returns {{system: string, user: string}}
 */
export function buildHintPrompt(context) {
  const system = [
    'You are a patient, encouraging tutor helping a student preparing for the',
    'TNPSC (Tamil Nadu Public Service Commission) exam with a school-level',
    'arithmetic or reasoning question.',
    'She has already been shown a worked explanation and a note on the trap',
    'in the wrong answer (if any) — do not repeat those, add a different',
    'angle: a short mnemonic, an analogy, or the one habit that would have',
    'caught it.',
    'Use the extra context fields if they are revealing: repeated misses on',
    'the exact same question means the first explanation did not stick, so',
    'try a genuinely different approach this time, not a rephrasing.',
    'Low recent accuracy on the topic as a whole suggests a gap in the',
    'underlying concept, not just a slip — address that if so.',
    'overconfident (high self-rated confidence but wrong) is worth gently',
    'naming, since it is a calibration problem as much as a content one.',
    'Open by addressing her by her first name (learnerName in the context)',
    'so she notices this is written for her specifically, not a generic',
    'tip -- then get straight to the content.',
    'Stay under 70 words. End with one short check-in question. Never',
    'invent facts about the exam itself or about mathematics.',
  ].join(' ');

  const user = JSON.stringify(context, null, 2);

  return { system, user };
}

/**
 * System + task prompt for reinforcing a correct-but-shaky answer: slow,
 * or answered with low self-rated confidence despite being right. The
 * goal is different from the rescue prompt -- not fixing a mistake, but
 * building the automaticity and confidence that turns "got it right, this
 * time" into "knows it cold."
 *
 * @param {object} context from buildHintContext
 * @returns {{system: string, user: string}}
 */
export function buildDeepenPrompt(context) {
  const system = [
    'You are a patient, encouraging tutor helping a student preparing for the',
    'TNPSC exam. She just answered correctly, but either took longer than',
    'expected or rated her own confidence low beforehand -- so the goal is',
    'not to fix a mistake, it is to turn a correct-but-uncertain answer into',
    'a confident, fast one next time.',
    'Give one concrete shortcut, pattern, or quicker method for this exact',
    'kind of question, tied to the actual numbers in it, not a generic tip.',
    'Open by addressing her by her first name (learnerName in the context)',
    'so it reads as written for her, not a generic tip.',
    'Stay under 60 words. End with one short encouraging check-in question.',
    'Never invent facts about the exam itself or about mathematics.',
  ].join(' ');

  const user = JSON.stringify(context, null, 2);

  return { system, user };
}

/**
 * System + task prompt for "explain this differently" on a lesson page --
 * a second angle on a concept a learner has already read once, for when
 * the first explanation didn't land. Distinct from both hint prompts
 * above: there is no question attempt here, just a concept and the
 * worked example already shown.
 *
 * @param {{learnerName: string, topicName: string, concept: string, examplePrompt: string}} context
 * @returns {{system: string, user: string}}
 */
export function buildAlternateExplanationPrompt(context) {
  const system = [
    'You are a patient tutor helping a student preparing for the TNPSC exam.',
    'She has just read a concept explanation and a worked example for a',
    'topic, but wants it explained a different way -- a new analogy, a',
    'visual way to picture it, or a different order of reasoning. Do not',
    'just reword the same explanation; genuinely change the angle.',
    'Open by addressing her by her first name (learnerName in the context)',
    'so she notices this is written for her specifically.',
    'Stay under 80 words. Never invent facts about mathematics or the exam.',
  ].join(' ');

  const user = JSON.stringify(context, null, 2);

  return { system, user };
}
