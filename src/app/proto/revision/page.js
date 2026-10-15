'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';

export default function Revision() {
  const [dueItems, setDueItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/revision/due', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => !cancelled && setDueItems(data.items ?? []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Revision</span>
      <h1 style={{ marginTop: 10 }}>Keep what you&apos;ve learned</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {dueItems.length} concept{dueItems.length === 1 ? '' : 's'} due today. Everything else is still holding — you&apos;ll be told when that changes.
      </p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load revision schedule: {error}</p>
        </div>
      )}

      <div className="grid-3" style={{ marginTop: 24 }}>
        <div className="card-tint">
          <h3 style={{ fontSize: '1.2rem' }}>Quick revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>One question per due concept.</p>
          <Link href="/proto/revision/session" style={{ display: 'inline-block', marginTop: 14, color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Start →</Link>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.2rem' }}>Deep revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>Same real questions, taken more deliberately.</p>
          <Link href="/proto/revision/session" style={{ display: 'inline-block', marginTop: 14, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Start →</Link>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.2rem' }}>Mistake revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>Only questions you&apos;ve got wrong before.</p>
          <Link href="/proto/mistakes" style={{ display: 'inline-block', marginTop: 14, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Open →</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        <span className="pill-tab active">Due today · {dueItems.length}</span>
        {['Upcoming', 'Weak memory', 'Recently learned', 'Retained'].map((t) => (
          <span key={t} className="pill-tab btn-disabled" title="Not backed by data yet">{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {dueItems.length === 0 && (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>Nothing is due for review right now.</p>
          </div>
        )}
        {dueItems.map((r, i) => (
          <div key={r.topicId} className={i === 0 ? 'card-tint' : 'card'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.3rem' }}>{r.topicName}</h3>
                <span className={`badge ${i === 0 ? 'badge-revision-due' : 'badge-mastered'}`}>
                  {r.intervalDays.toFixed(0)}-day interval
                </span>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>Due {new Date(r.scheduledAt).toLocaleDateString()}.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, maxWidth: 320 }}>
                <ProgressBar value={r.retentionPct} color={i === 0 ? 'var(--secondary)' : 'var(--primary)'} />
                <strong style={{ fontSize: '0.85rem' }}>{r.retentionPct}%</strong>
              </div>
            </div>
            <Link href="/proto/revision/session" className="btn btn-primary">Review</Link>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
