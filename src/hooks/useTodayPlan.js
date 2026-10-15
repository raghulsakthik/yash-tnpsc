'use client';

import { useEffect, useState } from 'react';
import { getHomeOverview } from '../api/home.api';

/** Home's data: the Next Best Action plan plus the revision-due list. */
export function useTodayPlan() {
  const [plan, setPlan] = useState(null);
  const [dueItems, setDueItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHomeOverview()
      .then((data) => {
        if (cancelled) return;
        const { dueItems: items, ...plan } = data;
        setPlan(plan);
        setDueItems(items ?? []);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, dueItems, error };
}
