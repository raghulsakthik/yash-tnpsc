'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to reset your password.');
        return;
      }
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch {
      setError('Unable to reach NOVA right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <div style={styles.error}>This reset link is missing its token. Request a new one from the <Link href="/forgot-password">forgot password</Link> page.</div>;
  }

  if (done) {
    return <div style={styles.success}>Password updated. Redirecting to sign in…</div>;
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label}>
        New password
        <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required minLength={8} />
      </label>
      <label style={styles.label}>
        Confirm new password
        <input style={styles.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your new password" autoComplete="new-password" required minLength={8} />
      </label>
      {error && <div role="alert" style={styles.error}>{error}</div>}
      <button type="submit" disabled={submitting} style={{ ...styles.primaryButton, opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Reset password</div>
          <h1 style={styles.title}>Choose a new password.</h1>
          <p style={styles.subtitle}>This resets your password and signs you out everywhere else.</p>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#fff8f5', color: '#1c1917', fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif", display: 'grid', placeItems: 'center', padding: '32px 18px' },
  shell: { width: '100%', maxWidth: 460 },
  card: { background: '#fff', border: '1px solid #eadfd7', borderRadius: 24, padding: '32px 30px', boxShadow: '0 22px 60px rgba(78,50,30,.10)' },
  eyebrow: { color: '#ea580c', fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', fontSize: 10, marginBottom: 9 },
  title: { fontFamily: 'Epilogue, Plus Jakarta Sans, system-ui, sans-serif', fontSize: 'clamp(27px, 6vw, 34px)', lineHeight: 1.1, letterSpacing: '-.035em', margin: 0, fontWeight: 750 },
  subtitle: { color: '#78716c', fontSize: 12, lineHeight: 1.65, margin: '12px 0 24px' },
  form: { display: 'grid', gap: 16 },
  label: { display: 'grid', gap: 7, color: '#44403c', fontSize: 11, fontWeight: 800 },
  input: { boxSizing: 'border-box', width: '100%', height: 48, border: '1px solid #e5e0d6', borderRadius: 11, background: '#fffdfb', color: '#1c1917', padding: '0 14px', outline: 'none', fontSize: 13, fontFamily: 'inherit' },
  error: { background: '#fff1f0', border: '1px solid #fecaca', color: '#b42318', borderRadius: 10, padding: '10px 12px', fontSize: 11, lineHeight: 1.5 },
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '12px 14px', fontSize: 12, lineHeight: 1.6 },
  primaryButton: { border: 0, height: 48, borderRadius: 11, background: '#ea580c', color: '#fff', fontWeight: 850, fontSize: 12, cursor: 'pointer', boxShadow: '0 8px 18px rgba(234,88,12,.2)' },
};
