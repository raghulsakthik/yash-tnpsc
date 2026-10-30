'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SearchIcon, StarIcon, BellIcon } from './Icon';

const topLinks = [
  { href: '/', label: 'Home' },
  { href: '/learn', label: 'Learn' },
  { href: '/practice', label: 'Practice', match: '/practice' },
  { href: '/quick-lab', label: 'Quick Lab' },
  { href: '/pyqs', label: 'PYQs' },
  { href: '/tests', label: 'Tests' },
  { href: '/journey', label: 'Journey' },
];

const bottomLinks = [
  { href: '/', label: 'Home' },
  { href: '/learn', label: 'Learn' },
  { href: '/practice', label: 'Practice', match: '/practice' },
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
        setIsAdmin(data.role === 'ADMIN' || data.role === 'SUPER_ADMIN');
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
            <Link
              href="/admin"
              className={isActive(pathname, { href: '/admin' }) ? 'active' : ''}
              style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', fontSize: '0.9rem', fontWeight: 500 }}
            >
              Admin
            </Link>
          )}
          <Link href="/search" aria-label="Search" title="Search" className={isActive(pathname, { href: '/search' }) ? 'active' : ''} style={{ display: 'flex' }}>
            <SearchIcon />
          </Link>
          <Link href="/bookmarks" aria-label="Bookmarks" title="Bookmarks" className={isActive(pathname, { href: '/bookmarks' }) ? 'active' : ''} style={{ display: 'flex' }}>
            <StarIcon />
          </Link>
          <Link href="/notifications" aria-label="Notifications" title="Notifications" className={isActive(pathname, { href: '/notifications' }) ? 'active' : ''} style={{ display: 'flex' }}>
            <BellIcon />
          </Link>
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
