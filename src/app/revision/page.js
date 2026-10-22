'use client';

import AppShell from '../_components/AppShell';
import LiveQuestion from '../_components/LiveQuestion';

export default function Revision() {
  return (
    <AppShell>
      <span className="eyebrow">Revision</span>
      <h1 style={{ marginTop: 10 }}>Keep what you&apos;ve learned</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Whatever is due comes up first. Nothing is due until its schedule says so.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <LiveQuestion
          nextQuestionUrl="/api/revision/next"
          submitUrl="/api/attempts"
          mode="REVISION"
          emptyCode="NOTHING_DUE"
          emptyTitle="All caught up"
          emptyMessage="Nothing is due for review right now — come back tomorrow."
        />
      </div>
    </AppShell>
  );
}
