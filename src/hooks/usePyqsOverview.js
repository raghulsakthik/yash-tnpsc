'use client';

import { useEffect, useState } from 'react';
import { getPyqsOverview } from '../api/pyqs.api';

export function usePyqsOverview() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPyqsOverview()
      .then((data) => !cancelled && setOverview(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { overview, error };
}
