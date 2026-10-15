'use client';

import { useQuestionSession } from './useQuestionSession';
import { getNextRevisionQuestion } from '../api/revision.api';
import { submitAttempt } from '../api/attempts.api';

/** "Memory Echo" — the revision question loop, used by revision/session/page.js. */
export function useRevisionSession() {
  return useQuestionSession(getNextRevisionQuestion, submitAttempt, {
    mode: 'REVISION',
    emptyCode: 'NOTHING_DUE',
  });
}
