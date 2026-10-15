'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTest, saveTestAnswer, submitTest } from '../api/tests.api';

/**
 * The weekly test's exam-UX state machine — load, answer/mark-for-review
 * (saved per selection), and submit. Used by
 * tests/weekly/[id]/TestInterface.js.
 */
export function useTest(testId) {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const shownAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    getTest(testId)
      .then((data) => {
        if (cancelled) return;
        setQuestions(data.questions);
        const initial = {};
        for (const q of data.questions) {
          initial[q.questionId] = { selectedIndex: q.selectedIndex, markedForReview: q.markedForReview };
        }
        setAnswers(initial);
        shownAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const saveAnswer = useCallback(
    (questionId, patch) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: { ...prev[questionId], ...patch } };
        const entry = next[questionId];
        saveTestAnswer(testId, {
          questionId,
          selectedIndex: entry.selectedIndex ?? null,
          markedForReview: entry.markedForReview ?? false,
          timeTakenMs: Date.now() - shownAt.current,
        }).catch(() => {});
        return next;
      });
    },
    [testId]
  );

  async function submit() {
    if (!window.confirm('Submit the test? You cannot change your answers afterward.')) return;
    setSubmitting(true);
    try {
      await submitTest(testId);
      router.push(`/proto/tests/weekly/${testId}/result`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return { questions, answers, current, setCurrent, loading, submitting, error, saveAnswer, submit };
}
