'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { DiamondIcon, BookOpenIcon, PencilIcon, QuestionIcon, GridIcon, BoltIcon, UploadIcon, CameraIcon, CheckSquareIcon, FlagIcon } from '../../_components/Icon';

const NAV = [
  { href: '/admin', label: 'Dashboard', Icon: DiamondIcon },
  { href: '/admin/subjects', label: 'Subjects & Topics', Icon: BookOpenIcon },
  { href: '/admin/lessons', label: 'Lessons', Icon: PencilIcon },
  { href: '/admin/questions', label: 'Questions', Icon: QuestionIcon },
  { href: '/admin/tests', label: 'Tests', Icon: GridIcon },
  { href: '/admin/quicklab', label: 'Quick Lab', Icon: BoltIcon },
  { href: '/admin/upload', label: 'Bulk Upload', Icon: UploadIcon },
  { href: '/admin/review', label: 'Review Queue', Icon: CheckSquareIcon },
  { href: '/admin/support', label: 'Support Center', Icon: FlagIcon },
  { href: '/admin/proctoring', label: 'Proctoring', Icon: CameraIcon },
];

function isActive(pathname, href) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href));
}

/**
 * The admin area's own chrome -- deliberately NOT a reskin of the learner
 * AppShell (top nav + bottom tabs). An admin manages the whole platform's
 * content, not their own progress, so this is a sidebar workspace layout
 * instead. Not a security boundary either way -- every /api/admin/* route
 * re-checks requireAdmin server-side regardless; this just keeps a
 * non-admin from landing on a page full of empty states and 403s.
 */
export default function AdminGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper-sunk)' }}>
      <aside
        style={{
          width: 230, flexShrink: 0, background: 'var(--ink)', color: '#fff',
          display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div style={{ padding: '0 20px 20px', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em' }}>
          ✦ Admin
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', fontSize: '0.9rem',
                  color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: active ? '3px solid var(--warm-accent)' : '3px solid transparent',
                  textDecoration: 'none',
                }}
              >
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><item.Icon width={16} height={16} /></span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px 20px 0' }}>
          <Link href="/profile" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', textDecoration: 'none' }}>
            ← Back to the learner app
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1100 }}>{children}</main>
    </div>
  );
}
