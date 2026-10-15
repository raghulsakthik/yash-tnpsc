'use client';

import { useCallback } from 'react';
import { useQuestionSession } from './useQuestionSession';
import { getNextQuestion } from '../api/questions.api';
import { submitAttempt } from '../api/attempts.api';

/** The practice session for one topic — used by practice/[topic]/page.js. */
export function usePractice(topicId) {
  const getNext = useCallback(() => getNextQuestion(topicId), [topicId]);
  return useQuestionSession(getNext, submitAttempt, { mode: 'PRACTICE' });
}
