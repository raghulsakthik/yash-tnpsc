'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../api/profile.api';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save(patch) {
    setProfile((p) => ({ ...p, ...patch }));
    try {
      const next = await updateProfile(patch);
      setProfile(next);
    } catch (err) {
      setError(err.message);
      refresh();
    }
  }

  return { profile, error, save };
}
