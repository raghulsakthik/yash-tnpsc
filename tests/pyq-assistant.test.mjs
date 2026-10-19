import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressiveHint, buildWhyExplanation, buildFullSolve } from '../src/domain/pyqAssistant.mjs';

const question = {
  prompt: 'What is 2+2?',
  options: ['3', '4', '5', '6'],
  answerIndex: 1,
  explanation: '2+2 = 4.',
  trap: '3 comes from a common off-by-one slip.',
  difficulty: 0.3,
};
const prerequisites = [{ topicId: 'aptitude.whole-numbers', topicName: 'Whole numbers' }];

test('stage 1 reveals only the hint, using the real authored trap', () => {
  const result = buildProgressiveHint(question, prerequisites, 1);
  assert.equal(result.levels.length, 1);
  assert.equal(result.levels[0].kind, 'HINT');
  assert.match(result.levels[0].content, /off-by-one/);
});

test('stage 4 reveals every level, cumulatively, ending in the full explanation', () => {
  const result = buildProgressiveHint(question, prerequisites, 4);
  assert.equal(result.levels.length, 4);
  assert.equal(result.levels.map((l) => l.kind).join(','), 'HINT,STRATEGY,GUIDED_SOLUTION,FULL_EXPLANATION');
  assert.match(result.levels[3].content, /correct option is "4"/);
});

test('stage is clamped into 1..4, never out of range', () => {
  assert.equal(buildProgressiveHint(question, prerequisites, 0).stage, 1);
  assert.equal(buildProgressiveHint(question, prerequisites, 99).stage, 4);
});

test('strategy names the real prerequisite topic, not a generic placeholder', () => {
  const result = buildProgressiveHint(question, prerequisites, 2);
  assert.match(result.levels[1].content, /Whole numbers/);
});

test('why-explanation names the real trap for the option she actually picked', () => {
  const result = buildWhyExplanation(question, 0);
  const wrongOption = result.whyOthersWrong.find((o) => o.option === '3');
  assert.match(wrongOption.reason, /off-by-one/);
  assert.match(result.whySelectedWasWrong, /off-by-one/);
});

test('why-explanation reports no wrongness when she actually picked the correct option', () => {
  const result = buildWhyExplanation(question, 1);
  assert.equal(result.whySelectedWasWrong, null);
});

test('why-explanation never invents a reason when nothing was selected yet', () => {
  const result = buildWhyExplanation(question, null);
  assert.equal(result.whySelectedWasWrong, undefined);
  assert.equal(result.whyCorrect, question.explanation);
});

test('full solve attaches a real similar question when the repository found one', () => {
  const result = buildFullSolve(question, { id: 'other-001', prompt: 'What is 3+3?' });
  assert.equal(result.similarQuestion.questionId, 'other-001');
  assert.equal(result.similarQuestionNote, null);
});

test('full solve is honest when no real similar question exists yet, never fabricating one', () => {
  const result = buildFullSolve(question, null);
  assert.equal(result.similarQuestion, null);
  assert.match(result.similarQuestionNote, /no other real question/);
});
