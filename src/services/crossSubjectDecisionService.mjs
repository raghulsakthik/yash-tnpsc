// Phase 23 — CrossSubjectDecisionService. The full hierarchy: Learner State
// -> Subject Priority (new, this phase) -> Topic Priority -> Action
// Priority -> Content/Question Selection. Every stage after "Subject
// Priority" reuses existing, unchanged primitives: gateTopic()/examWeight()/
// selectTopic() (Phase 1/7, unchanged), findCandidateTopicStates()/
// findPrerequisiteGraphForTopics() (Phase 7/3, already generic over an
// arbitrary topicIds array), and decideNextActionForTopic() (Phase 11,
// unchanged) for the final action. Question selection itself is already
// wired into the existing /api/questions/next route — this service decides
// the topic that route should be called for, not a second selector.
import { selectSubject, subjectExamWeight, daysSince } from '../domain/crossSubjectDecision.mjs';
import { selectTopic, examWeight } from '../domain/selection.mjs';
import { gateTopic } from '../domain/learningPlan.mjs';
import { decideNextActionForTopic } from './adaptiveDecisionService.mjs';
import { findSubjectAggregates, findContentTopicIdsForSubject } from '../repository/crossSubjectRepository.mjs';
import { findCandidateTopicStates } from '../repository/learningPlanRepository.mjs';
import { findPrerequisiteGraphForTopics } from '../repository/defaultAssessmentRepository.mjs';

export async function getCrossSubjectDecision(learnerId) {
  const subjectRows = await findSubjectAggregates(learnerId);
  const maxSubjectQuestionCount = Math.max(1, ...subjectRows.map((s) => s.subject_question_count));

  const subjects = subjectRows.map((s) => ({
    id: s.id,
    name: s.name,
    accuracy: s.weighted_accuracy,
    examWeight: subjectExamWeight(s.subject_question_count, maxSubjectQuestionCount),
    attemptCount: s.attempt_count,
    daysSinceLastStudied: daysSince(s.last_studied_at),
  }));

  // Only a subject with real, published content can be selected — picking
  // one with nothing to serve would be a decision with no action to follow.
  const topicIdsBySubject = new Map();
  for (const s of subjects) topicIdsBySubject.set(s.id, await findContentTopicIdsForSubject(s.id));
  const subjectsWithContent = subjects.filter((s) => topicIdsBySubject.get(s.id).length > 0);

  const selectedSubject = selectSubject(subjectsWithContent);
  if (!selectedSubject) {
    return {
      subjects,
      selectedSubject: null,
      topicId: null,
      topicName: null,
      action: null,
      reason: 'no subject currently has published content',
    };
  }

  const topicIds = topicIdsBySubject.get(selectedSubject.id);
  const [states, edges] = await Promise.all([
    findCandidateTopicStates(learnerId, topicIds),
    findPrerequisiteGraphForTopics(topicIds),
  ]);

  const prerequisiteGraph = new Map();
  for (const e of edges) {
    if (!prerequisiteGraph.has(e.topic_id)) prerequisiteGraph.set(e.topic_id, []);
    prerequisiteGraph.get(e.topic_id).push({ id: e.prerequisite_topic_id, strength: e.strength });
  }
  const accuracyByTopic = new Map(states.map((s) => [s.id, s.accuracy]));
  const maxChapterQuestionCount = Math.max(1, ...states.map((s) => s.chapter_question_count));

  const topicCandidates = states.map((s) => {
    const gate = gateTopic(s.id, prerequisiteGraph, accuracyByTopic);
    return {
      id: s.id,
      name: s.name,
      accuracy: s.accuracy,
      attemptCount: s.attempt_count,
      examWeight: examWeight(s.chapter_question_count, s.topic_count, maxChapterQuestionCount),
      prerequisiteGap: gate.weakestPrerequisite ? 1 - gate.weakestPrerequisite.accuracy / 100 : 0,
      gate,
    };
  });

  const openTopics = topicCandidates.filter((c) => c.gate.open);
  const selectedTopic = selectTopic(openTopics.length > 0 ? openTopics : topicCandidates);
  const decision = selectedTopic ? await decideNextActionForTopic(learnerId, selectedTopic.id) : null;

  return {
    subjects,
    selectedSubject: { id: selectedSubject.id, name: selectedSubject.name, score: selectedSubject.score },
    topicId: selectedTopic?.id ?? null,
    topicName: selectedTopic?.name ?? null,
    action: decision?.action ?? null,
    decision,
  };
}
