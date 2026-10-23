// Phase 29.2 — AiTrainingDatasetService. Pulls real rows
// (aiTrainingDatasetRepository.mjs) and shapes them (aiTrainingDataset.mjs)
// into the brief's structured training examples — never reads
// ai_interaction (raw AI conversations), per the brief's own instruction.
import { buildTrainingDataset } from '../domain/aiTrainingDataset.mjs';
import {
  findApprovedQuestionsSample,
  findPyqQuestionsSample,
  findTopicsWithSampleExplanation,
  findPrerequisiteEdgesWithNames,
  findEvaluatedInterventions,
} from '../repository/aiTrainingDatasetRepository.mjs';

export async function getTrainingDataset() {
  const [questions, pyqQuestions, topicsWithSampleQuestion, prerequisiteEdges, evaluatedInterventions] = await Promise.all([
    findApprovedQuestionsSample(),
    findPyqQuestionsSample(),
    findTopicsWithSampleExplanation(),
    findPrerequisiteEdgesWithNames(),
    findEvaluatedInterventions(),
  ]);

  return buildTrainingDataset({
    questions,
    pyqQuestions,
    topicsWithSampleQuestion: topicsWithSampleQuestion.map((t) => ({ topicId: t.topic_id, topicName: t.topic_name, sampleExplanation: t.sample_explanation })),
    prerequisiteEdges: prerequisiteEdges.map((e) => ({
      topicId: e.topic_id,
      topicName: e.topic_name,
      prerequisiteTopicId: e.prerequisite_topic_id,
      prerequisiteTopicName: e.prerequisite_topic_name,
      strength: e.strength,
    })),
    evaluatedInterventions: evaluatedInterventions.map((i) => ({ topicId: i.topic_id, interventionType: i.intervention_type, learningGain: i.learning_gain })),
  });
}
