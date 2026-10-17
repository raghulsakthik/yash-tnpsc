'use client';

import { useEffect, useState } from 'react';
import { wedgePath } from './pieMath';

const STATUS_META = {
  mastered: { label: 'Mastered', color: 'var(--success)' },
  retained: { label: 'Retained', color: 'var(--success)' },
  'near-mastery': { label: 'Near mastery', color: 'var(--secondary)' },
  practising: { label: 'Practising', color: 'var(--primary)' },
  learning: { label: 'Learning', color: 'var(--primary)' },
  'revision-due': { label: 'Revision due', color: 'var(--warm-accent)' },
  'not-started': { label: 'Not started', color: 'var(--border)' },
};

const ORDER = ['mastered', 'retained', 'near-mastery', 'practising', 'learning', 'revision-due', 'not-started'];

export default function StatusPieChart() {
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/progress/status-breakdown', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load your progress breakdown');
        setBreakdown(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="muted" style={{ fontSize: '0.85rem' }}>{error}</p>;
  if (!breakdown) return <p className="muted">Loading…</p>;

  const counts = new Map(breakdown.breakdown.map((b) => [b.status, b.count]));
  const total = breakdown.totalTopics || 1;
  const slices = ORDER.filter((s) => counts.has(s)).map((s) => ({ status: s, count: counts.get(s) }));

  const size = 180;
  const center = size / 2;
  const outerR = size / 2;
  const innerR = outerR * 0.6;

  let angle = 0;
  const wedges = slices.map((s) => {
    // Cap just under 360 -- an SVG arc can't close a full circle (its two
    // endpoints would coincide), which happens whenever every topic shares
    // one status (e.g. a brand-new account, all "not-started").
    const sweep = Math.min((s.count / total) * 360, 359.98);
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...s, path: sweep > 0 ? wedgePath(center, center, outerR, innerR, start, end) : null };
  });

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {wedges.map((w) =>
          w.path ? (
            <path
              key={w.status}
              d={w.path}
              fill={STATUS_META[w.status]?.color ?? 'var(--border)'}
              stroke="var(--paper-raised)"
              strokeWidth="2"
            />
          ) : null
        )}
        <text x={center} y={center - 4} textAnchor="middle" className="num" fontSize="22" fill="var(--ink)">
          {total}
        </text>
        <text x={center} y={center + 16} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">
          topics
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {slices.map((s) => (
          <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: STATUS_META[s.status]?.color ?? 'var(--border)',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--ink-muted)' }}>{STATUS_META[s.status]?.label ?? s.status}</span>
            <strong>{s.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
