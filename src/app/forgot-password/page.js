'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to send a reset link right now.');
        return;
      }
      setMessage(data.message);
    } catch {
      setError('Unable to reach YASH right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Forgot password</div>
          <h1 style={styles.title}>Reset your password.</h1>
          <p style={styles.subtitle}>Enter the email on your account and we&apos;ll send a reset link if it exists.</p>

          {message ? (
            <div style={styles.success}>{message}</div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Email address
                <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              {error && <div role="alert" style={styles.error}>{error}</div>}
              <button type="submit" disabled={submitting} style={{ ...styles.primaryButton, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <Link href="/login" style={styles.secondaryButton}>Back to sign in</Link>
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
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '12px 14px', fontSize: 12, lineHeight: 1.6, marginBottom: 10 },
  primaryButton: { border: 0, height: 48, borderRadius: 11, background: '#ea580c', color: '#fff', fontWeight: 850, fontSize: 12, cursor: 'pointer', boxShadow: '0 8px 18px rgba(234,88,12,.2)' },
  secondaryButton: { display: 'grid', placeItems: 'center', height: 46, borderRadius: 11, border: '1px solid #e5e0d6', background: '#f7f5f0', color: '#292524', textDecoration: 'none', fontSize: 11, fontWeight: 800, marginTop: 14 },
};
