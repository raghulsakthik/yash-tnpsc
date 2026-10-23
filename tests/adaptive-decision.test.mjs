import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCandidateActions, decideAdaptiveAction, ADAPTIVE_DECISION_CONFIG } from '../src/domain/adaptiveDecision.mjs';
import { TopicClassification, AdaptiveAction } from '../src/domain/enums.mjs';

const baseContext = {
  topicId: 'aptitude.percentage',
  classification: TopicClassification.WEAK,
  accuracy: 0.5,
  speed: 0.5,
  retention: 0.8,
  mastery: 0.5,
  misconceptionRisk: 0,
  prerequisiteRisk: 0,
  revisionDue: false,
  attemptCount: 3,
};

test('every candidate action is always scored, not short-circuited', () => {
  const scored = scoreCandidateActions(baseContext);
  const actions = scored.map((s) => s.action).sort();
  assert.deepEqual(actions, Object.values(AdaptiveAction).sort());
});

test('a brand new, untouched topic defaults to PRACTICE at the baseline score', () => {
  const context = { ...baseContext, classification: TopicClassification.UNKNOWN, accuracy: 0, speed: 0, retention: 0, mastery: 0, attemptCount: 0 };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.PRACTICE);
  assert.equal(decision.score, ADAPTIVE_DECISION_CONFIG.practiceBaselineScore);
});

test('CRITICAL with real prerequisite risk recommends fixing the prerequisite, not practicing the topic', () => {
  const context = { ...baseContext, classification: TopicClassification.CRITICAL, prerequisiteRisk: 0.7 };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.PREREQUISITE_LESSON);
});

test('PREREQUISITE_BLOCKED never recommends plain PRACTICE, even with no other signal', () => {
  const context = { ...baseContext, classification: TopicClassification.PREREQUISITE_BLOCKED, prerequisiteRisk: 0.9 };
  const scored = scoreCandidateActions(context);
  const practice = scored.find((s) => s.action === AdaptiveAction.PRACTICE);
  assert.equal(practice.score, 0);
});

test('WEAK with a real misconception signal recommends repeating the lesson, not just more practice', () => {
  const context = { ...baseContext, classification: TopicClassification.WEAK, misconceptionRisk: 0.6 };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.REPEAT_LESSON);
});

test('decent accuracy with slow pace recommends timed practice', () => {
  const context = { ...baseContext, accuracy: 0.8, speed: 0.2 };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.TIMED_PRACTICE);
});

test('a due revision always wins, regardless of how strong everything else looks', () => {
  const context = { ...baseContext, classification: TopicClassification.STRONG, mastery: 0.95, revisionDue: true };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.MEMORY_ECHO);
});

test('fading retention with nothing formally due yet nudges toward a soft revision', () => {
  const context = { ...baseContext, retention: 0.3, revisionDue: false };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.REVISION);
});

test('retention exactly 0 (never been through a revision cycle) never triggers REVISION — that is the DB default, not fading retention', () => {
  const context = { ...baseContext, retention: 0, revisionDue: false };
  const scored = scoreCandidateActions(context);
  assert.equal(scored.find((s) => s.action === AdaptiveAction.REVISION).score, 0);
});

test('STRONG with no revision due and nothing else pulling her back advances the topic', () => {
  const context = { ...baseContext, classification: TopicClassification.STRONG, mastery: 0.9, retention: 0.9, revisionDue: false };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.ADVANCE_TOPIC);
});

test('hitting the mini-assessment attempt interval recommends a recheck when nothing more urgent applies', () => {
  const context = {
    ...baseContext,
    classification: TopicClassification.STRONG,
    attemptCount: ADAPTIVE_DECISION_CONFIG.miniAssessmentAttemptInterval,
    mastery: 0.75,
    retention: 0.9,
    revisionDue: false,
  };
  const decision = decideAdaptiveAction(context);
  assert.equal(decision.action, AdaptiveAction.MINI_ASSESSMENT);
});

test('on a tie between MINI_ASSESSMENT and ADVANCE_TOPIC (both scored by mastery), verifying wins over assuming', () => {
  const context = {
    ...baseContext,
    classification: TopicClassification.STRONG,
    attemptCount: ADAPTIVE_DECISION_CONFIG.miniAssessmentAttemptInterval,
    mastery: 0.8,
    retention: 0.9,
    revisionDue: false,
  };
  const scored = scoreCandidateActions(context);
  const miniAssessment = scored.find((s) => s.action === AdaptiveAction.MINI_ASSESSMENT);
  const advanceTopic = scored.find((s) => s.action === AdaptiveAction.ADVANCE_TOPIC);
  assert.equal(miniAssessment.score, advanceTopic.score); // confirms this really is a tie, not a fluke
  assert.equal(decideAdaptiveAction(context).action, AdaptiveAction.MINI_ASSESSMENT);
});

test('the decision carries every runner-up score, ranked, not just the winner', () => {
  const decision = decideAdaptiveAction(baseContext);
  assert.ok(decision.candidates.length === Object.values(AdaptiveAction).length);
  for (let i = 1; i < decision.candidates.length; i += 1) {
    assert.ok(decision.candidates[i - 1].score >= decision.candidates[i].score);
  }
});
