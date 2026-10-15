'use client';

import AppShell from '../_components/AppShell';
import JourneyTabs from './JourneyTabs';
import { useJourney } from '../../../hooks/useJourney';

export default function Journey() {
  const { journey, error } = useJourney();

  return (
    <AppShell>
      <span className="eyebrow">Journey</span>
      <h1 style={{ marginTop: 10 }}>Where you started, where you are</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {journey?.since
          ? `Since ${new Date(journey.since).toLocaleDateString()} — everything below is the distance since.`
          : 'Everything below is the distance since your first attempt.'}
      </p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load your journey: {error}</p>
        </div>
      )}
      {journey ? <JourneyTabs journey={journey} /> : <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}
    </AppShell>
  );
}
