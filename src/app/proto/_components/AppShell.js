'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useJourney } from '../../../hooks/useJourney';

const topLinks = [
  { href: '/proto/home', label: 'Home' },
  { href: '/proto/learn', label: 'Learn' },
  { href: '/proto/revision', label: 'Practice' },
  { href: '/proto/quick-lab', label: 'Quick Lab' },
  { href: '/proto/pyqs', label: 'PYQs' },
  { href: '/proto/tests', label: 'Tests' },
  { href: '/proto/journey', label: 'Journey' },
];

const bottomLinks = [
  { href: '/proto/home', label: 'Home' },
  { href: '/proto/learn', label: 'Learn' },
  { href: '/proto/revision', label: 'Practice' },
  { href: '/proto/journey', label: 'Journey' },
  { href: '/proto/profile', label: 'Profile' },
];

function isActive(pathname, href) {
  return pathname === href || (href !== '/proto/home' && pathname.startsWith(href));
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { journey } = useJourney();

  return (
    <>
      <header className="topnav">
        <Link href="/proto/home" className="brand">
          <span className="spark">✦</span> NOVA
        </Link>
        <nav>
          {topLinks.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(pathname, l.href) ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          <span className="streak-chip">
            <span className="dot" /> {journey?.streak?.current ?? 0} day streak
          </span>
          <Link href="/proto/profile" className="avatar">Y</Link>
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <nav className="bottomnav">
        <ul>
          {bottomLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={isActive(pathname, l.href) ? 'active' : ''}>
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
