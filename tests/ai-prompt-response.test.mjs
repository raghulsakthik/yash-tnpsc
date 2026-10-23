import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptForTask } from '../src/domain/ai/promptTemplates.mjs';
import { validateAiResponse, AI_RESPONSE_VALIDATION_CONFIG } from '../src/domain/ai/responseValidator.mjs';
import { AITaskType } from '../src/domain/enums.mjs';

test('every real AITaskType has a registered prompt template, none falls through', () => {
  for (const task of Object.values(AITaskType)) {
    const prompt = buildPromptForTask(task, { topic: 'x' });
    assert.ok(prompt.system.length > 0, task);
    assert.ok(prompt.user.length > 0, task);
  }
});

test('an unregistered task throws rather than silently returning a generic prompt', () => {
  assert.throws(() => buildPromptForTask('NOT_A_REAL_TASK', {}));
});

test('the prompt never hardcodes the context — it is the real, serialized object passed in', () => {
  const prompt = buildPromptForTask(AITaskType.GIVE_HINT, { topic: 'percentage', mastery: 0.5 });
  assert.match(prompt.user, /"topic": "percentage"/);
});

test('an empty response is invalid, never silently accepted', () => {
  assert.equal(validateAiResponse('').valid, false);
  assert.equal(validateAiResponse('   ').valid, false);
});

test('a response claiming authority over learner mastery is rejected', () => {
  const result = validateAiResponse('Great job! Your mastery is now 90% on this topic.');
  assert.equal(result.valid, false);
  assert.ok(result.reasons.some((r) => r.includes('authority')));
});

test('Phase 30.8\'s full guardrail list is enforced — exam-readiness and test-result overreach are rejected too', () => {
  assert.equal(validateAiResponse('Congratulations, you are now exam-ready!').valid, false);
  assert.equal(validateAiResponse('I have updated your test result to reflect this.').valid, false);
  assert.equal(validateAiResponse('I have changed the prerequisite for this topic.').valid, false);
  assert.equal(validateAiResponse('Publishing this question automatically for everyone.').valid, false);
});

test('a real, well-formed response within bounds passes', () => {
  const result = validateAiResponse('A clear, short, genuinely useful explanation of the method.');
  assert.equal(result.valid, true);
  assert.deepEqual(result.reasons, []);
});

test('a response past the configured max length is rejected', () => {
  const result = validateAiResponse('x'.repeat(AI_RESPONSE_VALIDATION_CONFIG.maxLength + 1));
  assert.equal(result.valid, false);
});
