'use client';

import { useEffect, useState } from 'react';
import { getOpenMistakes } from '../api/mistakes.api';
import { getHint } from '../api/ai.api';

/** The Mistakes page's open-mistake list plus "Ask the tutor". */
export function useMistakes() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [tutorHint, setTutorHint] = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOpenMistakes()
      .then((data) => !cancelled && setItems(data.items ?? []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  async function askTutor(questionId) {
    setTutorLoading(true);
    setTutorHint(null);
    try {
      const data = await getHint({ questionId });
      setTutorHint(data.available ? data.text : 'No AI tutor configured for this question.');
    } catch {
      setTutorHint('Could not reach the tutor right now.');
    } finally {
      setTutorLoading(false);
    }
  }

  return { items, error, tutorHint, tutorLoading, askTutor };
}
