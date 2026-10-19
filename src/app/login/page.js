'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Could not log in');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell-main narrow" style={{ paddingTop: 80, maxWidth: 420 }}>
      <p className="eyebrow">Welcome back</p>
      <h1 style={{ fontSize: '2rem' }}>Good to see you.</h1>
      <p className="muted" style={{ marginTop: 10 }}>Log in to pick up where you left off.</p>

      <form className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleSubmit}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: 'var(--warning)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Need an account?</Link>
      </p>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--ground)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-inter)',
};
