'use client';

import { useCallback, useEffect, useState } from 'react';
import { getNotifications, getNotificationPreferences, updateNotificationPreferences } from '../api/notifications.api';

export function useNotifications() {
  const [items, setItems] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    Promise.all([getNotifications(), getNotificationPreferences()])
      .then(([feed, preferences]) => {
        setItems(feed.items ?? []);
        setPrefs(preferences);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function togglePref(key) {
    if (!prefs) return;
    const next = { [key]: !prefs[key] };
    setPrefs((p) => ({ ...p, ...next }));
    try {
      await updateNotificationPreferences(next);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return { items, prefs, error, togglePref };
}
