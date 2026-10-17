'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Client-side gate for the /admin pages: not a security boundary (every
 * /api/admin/* route re-checks requireAdmin server-side regardless), just
 * keeps a non-admin from landing on a page full of empty states and
 * permission errors. Redirects anyone who isn't an admin back to Home.
 */
export default function AdminGuard({ children }) {
  const router = useRouter();
  const [state, setState] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (me?.role === 'admin') setState('allowed');
        else {
          setState('denied');
          router.replace('/');
        }
      })
      .catch(() => {
        setState('denied');
        router.replace('/');
      });
  }, [router]);

  if (state !== 'allowed') {
    return (
      <main className="shell-main narrow" style={{ paddingTop: 48 }}>
        <p className="muted">Checking access…</p>
      </main>
    );
  }

  return (
    <main className="shell-main" style={{ maxWidth: 960, paddingTop: 36, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
          <Link href="/admin" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', textDecoration: 'none' }}>
            Admin
          </Link>
          <Link href="/admin/upload" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Upload content
          </Link>
        </div>
        <Link href="/profile" style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>← Back to profile</Link>
      </div>
      {children}
    </main>
  );
}
