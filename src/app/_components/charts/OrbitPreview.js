'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const RING_COLOR = {
  mastered: 'var(--success)',
  learning: 'var(--primary)',
  drifting: 'var(--secondary)',
  struggling: 'var(--warm-accent)',
  unmet: 'var(--border)',
};

const RING_RADIUS = { mastered: 36, learning: 58, drifting: 78, struggling: 78, unmet: 96 };

export default function OrbitPreview() {
  const [orbit, setOrbit] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/journey', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load your journey');
        setOrbit(d.orbit ?? []);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="muted" style={{ fontSize: '0.85rem' }}>{error}</p>;
  if (!orbit) return <p className="muted">Loading…</p>;

  const size = 220;
  const center = size / 2;

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {[36, 58, 78, 96].map((r) => (
          <circle key={r} cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeDasharray="2 4" />
        ))}
        <circle cx={center} cy={center} r={17} fill="var(--ink)" />
        {orbit.map((t) => {
          const r = RING_RADIUS[t.ring] || 96;
          const rad = (t.angleDeg * Math.PI) / 180;
          const x = center + r * Math.cos(rad);
          const y = center + r * Math.sin(rad);
          return <circle key={t.name} cx={x} cy={y} r={5} fill={RING_COLOR[t.ring]} />;
        })}
      </svg>
      <div>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 220 }}>
          {orbit.length === 0
            ? 'Nothing placed yet — answer a few questions to see topics appear.'
            : `${orbit.length} topic${orbit.length === 1 ? '' : 's'} placed by how well they've stuck.`}
        </p>
        <Link href="/journey" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', display: 'inline-block', marginTop: 10 }}>
          See full journey →
        </Link>
      </div>
    </div>
  );
}
