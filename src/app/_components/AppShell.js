'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const DEFAULT_PRACTICE_TOPIC = 'aptitude.fractions';

const topLinks = [
  { href: '/', label: 'Home' },
  { href: '/learn', label: 'Learn' },
  { href: `/practice/${DEFAULT_PRACTICE_TOPIC}`, label: 'Practice', match: '/practice' },
  { href: '/quick-lab', label: 'Quick Lab' },
  { href: '/pyqs', label: 'PYQs' },
  { href: '/tests', label: 'Tests' },
  { href: '/journey', label: 'Journey' },
];

const bottomLinks = [
  { href: '/', label: 'Home' },
  { href: '/learn', label: 'Learn' },
  { href: `/practice/${DEFAULT_PRACTICE_TOPIC}`, label: 'Practice', match: '/practice' },
  { href: '/journey', label: 'Journey' },
  { href: '/profile', label: 'Profile' },
];

function isActive(pathname, link) {
  const match = link.match ?? link.href;
  return pathname === match || (match !== '/' && pathname.startsWith(match));
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [streak, setStreak] = useState(null);
  const [initial, setInitial] = useState('Y');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setStreak(data.streak);
        setInitial(data.name?.[0]?.toUpperCase() ?? 'Y');
        setIsAdmin(data.role === 'admin');
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="topnav">
        <Link href="/" className="brand">
          <span className="spark">✦</span> Yash
        </Link>
        <nav>
          {topLinks.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(pathname, l) ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          {isAdmin && (
            <Link href="/admin" className={isActive(pathname, { href: '/admin' }) ? 'active' : ''}>
              Admin
            </Link>
          )}
          {streak !== null && (
            <span className="streak-chip">
              <span className="dot" /> {streak} day streak
            </span>
          )}
          <Link href="/profile" className="avatar">{initial}</Link>
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <nav className="bottomnav">
        <ul>
          {bottomLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={isActive(pathname, l) ? 'active' : ''}>
                <span>✦</span>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
