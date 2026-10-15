'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startQuickLabSession, submitQuickLabAttempt, completeQuickLabSession } from '../api/quickLab.api';

export const QUICK_LAB_BANK_BACKED = new Set(['percentage-rush', 'fraction-lab']);
const ROUND_SECONDS = 120;

/** The Quick Lab round state machine — start, answer, timeout, finish. */
export function useQuickLab(mode) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [combo, setCombo] = useState(0);
  const [index, setIndex] = useState(1);
  const [roundLength, setRoundLength] = useState(10);
  const [picked, setPicked] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [error, setError] = useState(null);

  const shownAt = useRef(Date.now());
  const finishing = useRef(false);

  const finishOnTimeout = useCallback(async () => {
    if (finishing.current || !sessionId) return;
    finishing.current = true;
    try {
      await completeQuickLabSession(sessionId);
    } catch {
      // the result page re-reads the session either way
    }
    router.push(`/proto/quick-lab/${mode}/result?session=${sessionId}`);
  }, [sessionId, mode, router]);

  useEffect(() => {
    if (!QUICK_LAB_BANK_BACKED.has(mode)) return;
    let cancelled = false;
    startQuickLabSession(mode)
      .then((data) => {
        if (cancelled) return;
        setSessionId(data.sessionId);
        setQuestion(data.question);
        setRoundLength(data.roundLength);
        shownAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!sessionId || lastResult?.done) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          finishOnTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId, lastResult, finishOnTimeout]);

  async function pick(optionIndex) {
    if (picked !== null || !question) return;
    setPicked(optionIndex);
    try {
      const data = await submitQuickLabAttempt({
        sessionId,
        questionId: question.questionId,
        selectedIndex: optionIndex,
        timeTakenMs: Date.now() - shownAt.current,
      });
      setLastResult(data);
      setCombo(data.combo);
      setIndex((n) => n + 1);

      setTimeout(() => {
        if (data.done) {
          router.push(`/proto/quick-lab/${mode}/result?session=${sessionId}`);
        } else {
          setQuestion(data.nextQuestion);
          setPicked(null);
          setLastResult(null);
          shownAt.current = Date.now();
        }
      }, 500);
    } catch (err) {
      setError(err.message);
    }
  }

  return { question, combo, index, roundLength, picked, lastResult, secondsLeft, error, pick };
}
