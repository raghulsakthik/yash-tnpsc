'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

export default function Login() {
  const router = useRouter();
  const { status, error, submitting, login } = useAuth();
  const [password, setPassword] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const ok = await login(password);
    if (ok) router.push('/proto/home');
  }

  const firstTime = status?.authEnabled && !status.hasPassword;

  return (
    <main className="shell-main narrow" style={{ paddingTop: 80, maxWidth: 420 }}>
      <p className="eyebrow">{firstTime ? 'Set a password' : 'Welcome back'}</p>
      <h1 style={{ fontSize: '2rem' }}>{firstTime ? 'One password, just for you.' : 'Good to see you, Yash.'}</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {firstTime
          ? 'This is a private, single-learner instance — set a password once to lock it to you.'
          : 'Enter your password to continue.'}
      </p>

      <form className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={onSubmit}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: 'var(--warm-accent)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={submitting}>
          {submitting ? 'Please wait…' : firstTime ? 'Set password & continue' : 'Log in'}
        </button>
      </form>

      {!status?.authEnabled && (
        <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
          Auth isn&apos;t enabled on this instance (no <code>SESSION_SECRET</code> set) —{' '}
          <Link href="/proto/home" style={{ color: 'var(--primary)', fontWeight: 600 }}>continue to Home</Link>.
        </p>
      )}
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
