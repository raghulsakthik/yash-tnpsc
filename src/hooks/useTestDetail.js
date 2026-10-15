'use client';

import { useEffect, useState } from 'react';
import { getTest } from '../api/tests.api';

/** The read-only completed-test view behind the result and review pages. */
export function useTestDetail(testId) {
  const [test, setTest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getTest(testId)
      .then((data) => !cancelled && setTest(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [testId]);

  return { test, error };
}
