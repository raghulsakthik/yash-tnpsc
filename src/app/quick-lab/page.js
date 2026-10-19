'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';

export default function QuickLab() {
  const [modes, setModes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/quick-lab/modes', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load Quick Lab modes');
        setModes(d.modes);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Quick Lab</span>
      <h1 style={{ marginTop: 10 }}>Two minutes, sharper arithmetic</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Every round generates fresh questions — never the same drill twice. The
        exam is won on speed as much as accuracy.
      </p>

      {error && <div className="card" style={{ marginTop: 24, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!error && !modes && <p className="muted" style={{ marginTop: 24 }}>Loading…</p>}

      {modes && (
        <div className="grid-3" style={{ marginTop: 24 }}>
          {modes.map((m) => (
            <Link
              key={m.slug}
              href={`/quick-lab/${m.slug}`}
              className="card"
              style={{
                textDecoration: 'none', color: 'inherit',
                border: m.recommended ? '2px solid var(--warm-accent)' : undefined,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'var(--warm-tint)', color: 'var(--warm-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>✦</div>
              <h3 style={{ fontSize: '1.1rem' }}>{m.name}</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.88rem' }}>{m.desc}</p>
              <hr className="rule" style={{ margin: '14px 0 10px' }} />
              <span style={{ fontSize: '0.85rem', color: m.recommended ? 'var(--warm-accent)' : 'var(--ink-muted)', fontWeight: m.recommended ? 600 : 400 }}>
                10 questions, generated fresh
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">What a round is for</span>
        <p style={{ marginTop: 10 }}>
          Each round is 10 freshly generated questions — timed, scored, and
          summarised at the end with your accuracy, average answer time, and
          best combo.
        </p>
      </div>
    </AppShell>
  );
}
