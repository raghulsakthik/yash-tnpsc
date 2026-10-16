'use client';

import { useEffect, useState } from 'react';

const RING_COLOR = {
  mastered: 'var(--success)',
  learning: 'var(--primary)',
  drifting: 'var(--secondary)',
  struggling: 'var(--warm-accent)',
  unmet: 'var(--border)',
};

const RING_RADIUS = { mastered: 60, learning: 95, drifting: 130, struggling: 130, unmet: 160 };

function Orbit({ orbit }) {
  const size = 360;
  const center = size / 2;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {[60, 95, 130, 160].map((r) => (
            <circle key={r} cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeDasharray="3 4" />
          ))}
          <circle cx={center} cy={center} r={28} fill="var(--ink)" />
          <text x={center} y={center - 2} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">core</text>
          <text x={center} y={center + 11} textAnchor="middle" fill="var(--warm-accent)" fontSize="10">mastered</text>
          {orbit.map((t) => {
            const r = RING_RADIUS[t.ring] || 160;
            const rad = (t.angleDeg * Math.PI) / 180;
            const x = Math.round((center + r * Math.cos(rad)) * 100) / 100;
            const y = Math.round((center + r * Math.sin(rad)) * 100) / 100;
            return (
              <g key={t.name}>
                <circle cx={x} cy={y} r={7} fill={RING_COLOR[t.ring]} />
                <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">{t.name}</text>
              </g>
            );
          })}
        </svg>
        <div>
          <span className="eyebrow">Learning orbit</span>
          <h3 style={{ marginTop: 8 }}>Topics pull inward as they stick</h3>
          <p className="muted" style={{ marginTop: 10, maxWidth: 360 }}>
            Every topic you&apos;ve attempted is placed by its real mastery and
            revision state. Untouched topics don&apos;t appear yet — there&apos;s
            nothing to place.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {[
              ['mastered', 'Mastered and retained — inner ring'],
              ['learning', 'Being learned now'],
              ['drifting', 'Drifting — review due'],
              ['struggling', 'Struggling — low mastery'],
            ].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RING_COLOR[k] }} />
                {label}
              </div>
            ))}
          </div>
          {orbit.length === 0 && (
            <p className="muted" style={{ marginTop: 16 }}>Nothing here yet — answer a few questions to see topics appear.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordsTab({ personalRecords }) {
  return (
    <div className="card">
      <span className="eyebrow">Personal records · against yourself</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {personalRecords.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 0',
            borderTop: i ? '1px solid var(--border)' : 'none',
          }}>
            <span>{r.label}</span>
            <strong className="num">{r.value}</strong>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>There is no leaderboard and no other learners. These are your own real numbers.</p>
    </div>
  );
}

const TABS = ['Orbit', 'Records'];

export default function JourneyTabs() {
  const [tab, setTab] = useState('Orbit');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/journey', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load your journey');
        setData(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}>
        <p>Could not load your journey: {error}</p>
      </div>
    );
  }

  if (!data) {
    return <p className="muted" style={{ marginTop: 20 }}>Loading…</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} type="button" className={`pill-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Orbit' ? <Orbit orbit={data.orbit} /> : <RecordsTab personalRecords={data.personalRecords} />}
    </div>
  );
}
