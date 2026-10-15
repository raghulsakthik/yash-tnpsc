'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuthStatus, login as loginApi, logout as logoutApi } from '../api/auth.api';

/** Onboarding/login screens' state: whether auth is even on, whether a password is set, and login/logout actions. */
export function useAuth() {
  const [status, setStatus] = useState(null); // {authEnabled, hasPassword, authenticated}
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    getAuthStatus()
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(password) {
    setSubmitting(true);
    setError(null);
    try {
      await loginApi(password);
      refresh();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await logoutApi();
    refresh();
  }

  return { status, error, submitting, login, logout };
}
