'use client';

import { useState } from 'react';
import Link from 'next/link';
import { journeyOrbit, knowledgeGarden, personalRecords, storySoFar } from '../_data/mock';

const RING_COLOR = {
  mastered: 'var(--success)',
  learning: 'var(--primary)',
  drifting: 'var(--secondary)',
  struggling: 'var(--warm-accent)',
  unmet: 'var(--border)',
};

function Orbit() {
  const size = 360;
  const center = size / 2;
  const radii = { mastered: 60, learning: 95, drifting: 130, struggling: 130, unmet: 160 };

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
          {journeyOrbit.map((t) => {
            const r = radii[t.ring] || 160;
            const rad = (t.angle * Math.PI) / 180;
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
            Every topic you meet enters on the outer ring. Practice moves it in; a
            failed review pushes it back out. The centre is not &quot;finished&quot;
            — it is the set of things you could be asked about tomorrow and be fine.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {[
              ['mastered', 'Mastered and retained — inner ring'],
              ['learning', 'Being learned now'],
              ['drifting', 'Drifting — review due'],
              ['struggling', 'Struggling — the Confusion Map'],
              ['unmet', 'Not yet met'],
            ].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RING_COLOR[k] }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Garden() {
  return (
    <div className="card">
      <span className="eyebrow">Knowledge garden</span>
      <p className="muted" style={{ marginTop: 8 }}>The same information, slower and kinder: each topic is something growing. Nothing here dies — it just needs watering.</p>
      <div className="card-sunk" style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 28, padding: 24, height: 160 }}>
        {knowledgeGarden.map((g) => (
          <div key={g.name} style={{ textAlign: 'center' }}>
            <div style={{
              width: Math.max(10, g.height * 0.5), height: Math.max(10, g.height * 0.5), borderRadius: '50%',
              background: RING_COLOR[g.state], margin: '0 auto',
            }} />
            <div style={{ width: 2, height: g.height, background: RING_COLOR[g.state], margin: '0 auto' }} />
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4, maxWidth: 70 }}>{g.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="card">
      <span className="eyebrow">The story so far</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {storySoFar.map((s, i) => (
          <div key={s.title} style={{ display: 'flex', gap: 14, paddingBottom: 16, borderBottom: i < storySoFar.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span className="timeline-dot" style={{ marginTop: 6, background: `var(--${s.color === 'muted' ? 'ink-muted' : s.color})` }} />
            <div>
              <span className="muted" style={{ fontSize: '0.8rem' }}>{s.date}</span>
              <strong style={{ display: 'block', marginTop: 2 }}>{s.title}</strong>
              <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>{s.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordsTab() {
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
      <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>There is no leaderboard and no other learners. The only comparison here is to the version of you from a fortnight ago.</p>
    </div>
  );
}

const TABS = { Orbit, Garden, Timeline: TimelineTab, Records: RecordsTab };

export default function JourneyTabs() {
  const [tab, setTab] = useState('Orbit');
  const Active = TABS[tab];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, marginBottom: 20 }}>
        {Object.keys(TABS).map((t) => (
          <button key={t} type="button" className={`pill-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <Active />
      <Link href="/proto/weekly-review" className="card-tint" style={{ display: 'block', marginTop: 16, textDecoration: 'none' }}>
        <span className="eyebrow" style={{ color: 'var(--secondary)' }}>Week 3 is done</span>
        <h3 style={{ marginTop: 8 }}>Your weekly review is ready</h3>
        <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Open review →</span>
      </Link>
    </div>
  );
}
