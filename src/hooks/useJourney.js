'use client';

import { useEffect, useState } from 'react';
import { getJourneyOverview } from '../api/journey.api';

export function useJourney() {
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getJourneyOverview()
      .then((data) => !cancelled && setJourney(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { journey, error };
}
