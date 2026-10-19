'use client';

import { useEffect, useState } from 'react';

export default function Achievements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/achievements', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load achievements');
        setData(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="muted" style={{ fontSize: '0.85rem' }}>{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="eyebrow">Achievements</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>{data.unlockedCount} / {data.totalCount}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
          gap: 10,
          marginTop: 14,
        }}
      >
        {data.achievements.map((a) => (
          <div
            key={a.id}
            title={a.unlocked ? `${a.name} — unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : `${a.name} — ${a.description}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 8px',
              borderRadius: 14,
              background: a.unlocked ? 'var(--warm-tint)' : 'var(--paper-sunk)',
              border: a.unlocked ? '1px solid var(--warm-accent)' : '1px solid var(--border)',
              opacity: a.unlocked ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: '1.6rem', filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</span>
            <span style={{ fontSize: '0.72rem', textAlign: 'center', fontWeight: 600, lineHeight: 1.2 }}>{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
