'use client';

import { useEffect, useState } from 'react';
import { getDueRevisions } from '../api/revision.api';

/** The Revision page's "due today" list. */
export function useRevision() {
  const [dueItems, setDueItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getDueRevisions()
      .then((data) => !cancelled && setDueItems(data.items ?? []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { dueItems, error };
}
