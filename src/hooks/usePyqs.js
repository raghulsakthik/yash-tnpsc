'use client';

import { useCallback } from 'react';
import { useQuestionSession } from './useQuestionSession';
import { getNextPyq } from '../api/pyqs.api';
import { submitAttempt } from '../api/attempts.api';

const EMPTY_CODE = { 'weak-areas': 'NO_WEAK_AREAS', 'previously-wrong': 'NO_PREVIOUSLY_WRONG' };

/**
 * @param {string} slug either a real topicId (mode 'topic') or one of
 *   'weak-areas'/'previously-wrong' — mirrors the proto/pyqs/[topic] route
 *   reusing its dynamic segment for both cases.
 */
export function usePyqs(slug) {
  const isSpecialMode = slug === 'weak-areas' || slug === 'previously-wrong';
  const mode = isSpecialMode ? slug : 'topic';
  const getNext = useCallback(() => getNextPyq({ mode, topicId: isSpecialMode ? undefined : slug }), [mode, slug, isSpecialMode]);
  return useQuestionSession(getNext, submitAttempt, { mode: 'PYQ', emptyCode: EMPTY_CODE[mode] });
}
