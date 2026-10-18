'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LiveQuestion from '../../_components/LiveQuestion';

/** Real past-year questions (source_year IS NOT NULL), topic='all' for every topic combined. */
export default function Pyq({ params }) {
  const { topic } = use(params);
  const searchParams = useSearchParams();
  const year = searchParams.get('year');

  const query = new URLSearchParams();
  if (topic !== 'all') query.set('topic', topic);
  if (year) query.set('year', year);
  const qs = query.toString();

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href="/pyqs" style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ flex: 1 }}>Previous year questions{year ? ` · ${year}` : ''}</strong>
      </div>
      <div style={{ paddingTop: 36 }}>
        <LiveQuestion
          key={`${topic}-${year}`}
          nextQuestionUrl={`/api/pyqs/next${qs ? `?${qs}` : ''}`}
          submitUrl="/api/attempts"
          mode="PRACTICE"
          emptyCode="NO_QUESTIONS"
          emptyTitle="No past-year questions here yet"
          emptyMessage="This topic/year combination has no real transcribed questions on record."
        />
      </div>
    </main>
  );
}
