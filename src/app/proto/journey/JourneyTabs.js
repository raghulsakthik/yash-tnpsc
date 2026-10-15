'use client';

import { useState } from 'react';
import Link from 'next/link';

const RING_COLOR = {
  mastered: 'var(--success)',
  learning: 'var(--primary)',
  drifting: 'var(--secondary)',
  struggling: 'var(--warm-accent)',
  unmet: 'var(--border)',
};

const RING_BY_STATE = {
  MASTERED: 'mastered',
  NEAR_MASTERY: 'learning',
  PRACTISING: 'drifting',
  LEARNING: 'struggling',
  NOT_STARTED: 'unmet',
  NO_CONTENT: 'unmet',
};

const RADIUS_BY_RING = { mastered: 60, learning: 95, drifting: 130, struggling: 130, unmet: 160 };

function withOrbitLayout(topics) {
  return topics.map((t, i) => ({
    ...t,
    ring: RING_BY_STATE[t.state] ?? 'unmet',
    angle: (360 / Math.max(topics.length, 1)) * i,
  }));
}

function Orbit({ topics }) {
  const size = 360;
  const center = size / 2;
  const placed = withOrbitLayout(topics);
  const masteredCount = placed.filter((t) => t.ring === 'mastered').length;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {[60, 95, 130, 160].map((r) => (
            <circle key={r} cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeDasharray="3 4" />
          ))}
          <circle cx={center} cy={center} r={28} fill="var(--ink)" />
          <text x={center} y={center - 2} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">{masteredCount}</text>
          <text x={center} y={center + 11} textAnchor="middle" fill="var(--warm-accent)" fontSize="10">mastered</text>
          {placed.map((t) => {
            const r = RADIUS_BY_RING[t.ring] || 160;
            const rad = (t.angle * Math.PI) / 180;
            const x = Math.round((center + r * Math.cos(rad)) * 100) / 100;
            const y = Math.round((center + r * Math.sin(rad)) * 100) / 100;
            return (
              <g key={t.topicId}>
                <circle cx={x} cy={y} r={7} fill={RING_COLOR[t.ring]} />
                <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">{t.topicName}</text>
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
              ['mastered', 'Mastered — inner ring'],
              ['learning', 'Near mastery'],
              ['drifting', 'Practising'],
              ['struggling', 'Still learning'],
              ['unmet', 'Not started or no content yet'],
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

function Garden({ topics }) {
  const placed = withOrbitLayout(topics).filter((t) => t.attemptCount > 0);
  return (
    <div className="card">
      <span className="eyebrow">Knowledge garden</span>
      <p className="muted" style={{ marginTop: 8 }}>The same information, slower and kinder: each topic is something growing. Nothing here dies — it just needs watering.</p>
      <div className="card-sunk" style={{ marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 28, padding: 24, height: 160, overflowX: 'auto' }}>
        {placed.length === 0 && <p className="muted">Nothing planted yet — answer a few questions first.</p>}
        {placed.map((g) => {
          const height = Math.max(10, g.masteryScore * 150);
          return (
            <div key={g.topicId} style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: Math.max(10, height * 0.35), height: Math.max(10, height * 0.35), borderRadius: '50%',
                background: RING_COLOR[g.ring], margin: '0 auto',
              }} />
              <div style={{ width: 2, height, background: RING_COLOR[g.ring], margin: '0 auto' }} />
              <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4, maxWidth: 70 }}>{g.topicName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineTab({ journey }) {
  const since = journey.since ? new Date(journey.since).toLocaleDateString() : null;
  const entries = [
    since && {
      title: 'Started',
      date: since,
      note: 'Your first recorded attempt.',
      color: 'ink-muted',
    },
    {
      title: 'Where things stand now',
      date: 'Today',
      note: `${journey.topicsMastered} topic${journey.topicsMastered === 1 ? '' : 's'} mastered, ${journey.questionsSolved} questions solved over ${journey.activeDays} active day${journey.activeDays === 1 ? '' : 's'}.`,
      color: 'success',
    },
  ].filter(Boolean);

  return (
    <div className="card">
      <span className="eyebrow">The story so far</span>
      <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
        Only what&apos;s actually recorded — no invented milestones in between.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {entries.map((s, i) => (
          <div key={s.title} style={{ display: 'flex', gap: 14, paddingBottom: 16, borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span className="timeline-dot" style={{ marginTop: 6, background: `var(--${s.color})` }} />
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

function formatMs(ms) {
  if (ms == null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function RecordsTab({ journey }) {
  const r = journey.personalRecords;
  const rows = [
    ['Longest streak', `${r.longestStreak} day${r.longestStreak === 1 ? '' : 's'}`],
    ['Highest test score', r.highestTestScorePct != null ? `${r.highestTestScorePct}%` : '—'],
    ['Fastest correct answer', formatMs(r.fastestCorrectAnswerMs)],
    ['Most questions in a day', r.mostQuestionsInADay],
    ['Best retained topic', r.bestRetainedTopic?.topicName ?? '—'],
  ];
  return (
    <div className="card">
      <span className="eyebrow">Personal records · against yourself</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {rows.map(([label, value], i) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 0',
            borderTop: i ? '1px solid var(--border)' : 'none',
          }}>
            <span>{label}</span>
            <strong className="num">{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>There is no leaderboard and no other learners. The only comparison here is to the version of you from a fortnight ago.</p>
    </div>
  );
}

export default function JourneyTabs({ journey }) {
  const [tab, setTab] = useState('Orbit');
  const tabs = {
    Orbit: () => <Orbit topics={journey.topics} />,
    Garden: () => <Garden topics={journey.topics} />,
    Timeline: () => <TimelineTab journey={journey} />,
    Records: () => <RecordsTab journey={journey} />,
  };
  const Active = tabs[tab];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, marginBottom: 20 }}>
        {Object.keys(tabs).map((t) => (
          <button key={t} type="button" className={`pill-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
