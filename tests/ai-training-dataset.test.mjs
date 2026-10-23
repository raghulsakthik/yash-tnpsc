import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExplanationExamples,
  buildHintExamples,
  buildWrongAnswerExamples,
  buildPrerequisiteExplanationExamples,
  buildMistakeInterventionExamples,
  buildTrainingDataset,
} from '../src/domain/aiTrainingDataset.mjs';

const question = { id: 'q1', prompt: 'What is 2+2?', explanation: '2+2=4.', trap: '3 is an off-by-one slip.' };
const questionNoTrap = { id: 'q2', prompt: 'What is 3+3?', explanation: '3+3=6.', trap: null };

test('every real question with a real explanation becomes a real explanation example', () => {
  const examples = buildExplanationExamples([question]);
  assert.equal(examples.length, 1);
  assert.equal(examples[0].completion, question.explanation);
});

test('a question with no real authored trap produces no fabricated hint', () => {
  const examples = buildHintExamples([question, questionNoTrap]);
  assert.equal(examples.length, 1);
  assert.equal(examples[0].questionId, 'q1');
});

test('wrong-answer examples only come from a real authored trap', () => {
  const examples = buildWrongAnswerExamples([question, questionNoTrap]);
  assert.equal(examples.length, 1);
});

test('prerequisite examples cite the real, seeded dependency strength', () => {
  const examples = buildPrerequisiteExplanationExamples([{ topicId: 'a', topicName: 'Fractions', prerequisiteTopicName: 'Division', strength: 0.85 }]);
  assert.match(examples[0].completion, /0\.85/);
});

test('mistake-intervention examples only include a real, positive, evaluated gain', () => {
  const interventions = [
    { topicId: 't1', interventionType: 'PRACTICE', learningGain: 0.2 },
    { topicId: 't2', interventionType: 'REVISION', learningGain: -0.1 },
    { topicId: 't3', interventionType: 'LESSON', learningGain: null },
  ];
  const examples = buildMistakeInterventionExamples(interventions);
  assert.equal(examples.length, 1);
  assert.equal(examples[0].topicId, 't1');
});

test('the full dataset counts real examples by real type, never fabricating a category', () => {
  const dataset = buildTrainingDataset({ questions: [question, questionNoTrap] });
  assert.ok(dataset.totalExamples > 0);
  assert.ok('QUESTION_EXPLANATION' in dataset.byType);
});

test('an empty set of sources produces an honest, empty dataset, not a crash', () => {
  const dataset = buildTrainingDataset({});
  assert.equal(dataset.totalExamples, 0);
  assert.deepEqual(dataset.examples, []);
});
