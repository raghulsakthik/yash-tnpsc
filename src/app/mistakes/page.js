'use client';

import AppShell from '../_components/AppShell';
import LiveQuestion from '../_components/LiveQuestion';

export default function Mistakes() {
  return (
    <AppShell>
      <span className="eyebrow">My mistakes</span>
      <h1 style={{ marginTop: 10 }}>Worth returning to</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        The most recent still-open wrong answer. Each one leaves once you&apos;ve got it right again.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <LiveQuestion
          nextQuestionUrl="/api/mistakes/next"
          submitUrl="/api/attempts"
          mode="PRACTICE"
          emptyCode="NO_MISTAKES"
          emptyTitle="No open mistakes"
          emptyMessage="Nothing to review right now — every past mistake has since been answered correctly."
        />
      </div>
    </AppShell>
  );
}
