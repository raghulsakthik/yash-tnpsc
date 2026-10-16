'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { learner } from '../_data/mock';

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

  return (
    <>
      <header className="topnav">
        <Link href="/" className="brand">
          <span className="spark">✦</span> NOVA
        </Link>
        <nav>
          {topLinks.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(pathname, l) ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          <span className="streak-chip">
            <span className="dot" /> {learner.streak} day streak
          </span>
          <Link href="/profile" className="avatar">Y</Link>
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
