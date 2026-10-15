'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getHint } from '../api/ai.api';
import { ApiError } from '../api/client';

/**
 * The question/answer/feedback loop engine behind
 * src/app/proto/_components/QuestionSession.js — identical state machine
 * to before this moved into a hook, just parameterized over api functions
 * (getNextQuestion, submitAttempt) instead of URL strings, so Practice, the
 * Revision session and any other question-delivery screen can share it
 * without each repeating the fetch/state wiring.
 *
 * @param {() => Promise<object>} getNextQuestion
 * @param {(payload: object) => Promise<object>} submitAttempt
 * @param {{mode: string, sessionLength?: number, emptyCode?: string}} options
 */
export function useQuestionSession(getNextQuestion, submitAttempt, { mode, sessionLength = 10, emptyCode }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [aiHint, setAiHint] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const shownAt = useRef(Date.now());

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmpty(false);
    setSelected(null);
    setResult(null);
    setAiHint(null);
    setAiUnavailable(false);
    try {
      const data = await getNextQuestion();
      setQuestion(data);
      shownAt.current = Date.now();
    } catch (err) {
      if (emptyCode && err instanceof ApiError && err.code === emptyCode) {
        setEmpty(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getNextQuestion, emptyCode]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function submit() {
    if (selected === null || !question) return;
    setLoading(true);
    try {
      const data = await submitAttempt({
        attemptId: crypto.randomUUID(),
        questionId: question.questionId,
        selectedIndex: selected,
        timeTakenMs: Date.now() - shownAt.current,
        confidence: null,
        mode,
      });
      setResult(data);
      setAnswered((n) => n + 1);
      if (data.correct) setCorrectCount((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function getAiHint() {
    if (!result || !question) return;
    setAiLoading(true);
    try {
      const data = await getHint({
        questionId: question.questionId,
        selectedIndex: selected,
        mistakeType: result.mistakeType,
      });
      if (data.available) setAiHint(data.text);
      else setAiUnavailable(true);
    } catch {
      setAiUnavailable(true);
    } finally {
      setAiLoading(false);
    }
  }

  return {
    question,
    selected,
    setSelected,
    result,
    error,
    empty,
    loading,
    answered,
    correctCount,
    sessionLength,
    aiHint,
    aiLoading,
    aiUnavailable,
    loadNext,
    submit,
    getAiHint,
  };
}
