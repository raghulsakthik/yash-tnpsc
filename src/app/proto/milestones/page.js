'use client';

import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';
import { useMilestones } from '../../../hooks/useMilestones';
import { useJourney } from '../../../hooks/useJourney';

export default function Milestones() {
  const { items, error } = useMilestones();
  const { journey } = useJourney();
  const streak = journey?.streak ?? { current: 0, longest: 0 };

  const earned = items?.filter((m) => m.earned) ?? [];
  const inProgress = items?.filter((m) => !m.earned) ?? [];

  return (
    <AppShell>
      <span className="eyebrow">Milestones</span>
      <h1 style={{ marginTop: 10 }}>{earned.length} earned, and none of them for turning up</h1>
      <p className="muted" style={{ marginTop: 10 }}>Each one takes real evidence — a topic that holds at review, a paper completed, a streak of genuine sessions.</p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load milestones: {error}</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <span className="eyebrow">Learning streak · the only one that counts</span>
        <div className="num" style={{ fontSize: '2.5rem', color: 'var(--warm-accent)', marginTop: 8 }}>
          {streak.current} <span className="muted" style={{ fontSize: '1rem' }}>days · longest was {streak.longest}</span>
        </div>
        <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
          A day counts when at least one question is answered — not when the app is opened.
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: 6,
              background: i < streak.current ? 'var(--warm-accent)' : 'var(--paper-sunk)',
            }} />
          ))}
        </div>
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Earned</span>
      <div className="grid-3">
        {earned.map((e) => (
          <div key={e.id} className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>✦</span>
              <div>
                <strong>{e.name}</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{e.note}</p>
                <span className="muted" style={{ fontSize: '0.78rem', color: 'var(--success)' }}>
                  {new Date(e.earnedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        {earned.length === 0 && items && <p className="muted">Nothing earned yet.</p>}
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Not yet</span>
      <div className="grid-3">
        {inProgress.map((e) => (
          <div key={e.id} className="card">
            <strong>{e.name}</strong>
            <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{e.note}</p>
            <div style={{ marginTop: 10 }}><ProgressBar value={e.progressPct} color="var(--warm-accent)" /></div>
            <span className="muted" style={{ fontSize: '0.78rem' }}>{e.progressPct}%</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
