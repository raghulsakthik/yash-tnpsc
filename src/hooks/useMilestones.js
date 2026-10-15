'use client';

import { useEffect, useState } from 'react';
import { getMilestones } from '../api/milestones.api';

export function useMilestones() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMilestones()
      .then((data) => !cancelled && setItems(data.items ?? []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, error };
}
