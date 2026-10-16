'use client';

import { use } from 'react';
import Link from 'next/link';
import LiveQuestion from '../../_components/LiveQuestion';

export default function Practice({ params }) {
  const { topic } = use(params);

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ flex: 1 }}>Practice</strong>
      </div>
      <div style={{ paddingTop: 36 }}>
        <LiveQuestion
          key={topic}
          nextQuestionUrl={`/api/questions/next?topic=${topic}`}
          submitUrl="/api/attempts"
          mode="PRACTICE"
        />
      </div>
    </main>
  );
}
