'use client';

import Link from 'next/link';
import AppShell from '../../_components/AppShell';
import { ProgressBar } from '../../_components/ui';
import { usePyqsOverview } from '../../../../hooks/usePyqsOverview';

const MISTAKE_LABEL = {
  CONCEPTUAL: 'Conceptual',
  CARELESS: 'Careless',
  GUESS: 'Guessed',
  TIME_PRESSURE: 'Ran out of time',
  OVERCONFIDENT: 'Overconfident',
  UNKNOWN: 'Unclassified',
};

export default function PyqAnalysis() {
  const { overview, error } = usePyqsOverview();

  if (error) {
    return (
      <AppShell>
        <p>Could not load PYQ analysis: {error}</p>
      </AppShell>
    );
  }
  if (!overview) {
    return (
      <AppShell>
        <p className="muted">Loading…</p>
      </AppShell>
    );
  }

  const incorrect = overview.attempted - overview.correct;
  const weakest = overview.byTopic[0];

  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/proto/pyqs" style={{ color: 'var(--primary)', textDecoration: 'none' }}>PYQs</Link> / Analysis
      </div>
      <h1 style={{ marginTop: 10 }}>What {overview.attempted} questions revealed</h1>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{overview.attempted}</div><div className="label">attempted</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{overview.correct}</div><div className="label">correct</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{incorrect}</div><div className="label">incorrect</div></div>
          <div className="stat"><div className="num">{overview.accuracyPct}%</div><div className="label">accuracy</div></div>
        </div>
      </div>

      {weakest && (
        <div className="card-dark" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>What to study next</span>
            <h2 style={{ color: '#fff', marginTop: 10 }}>
              {weakest.topicName} is where the marks are going — {weakest.accuracyPct}% so far.
            </h2>
          </div>
          <Link href={`/proto/pyqs/${weakest.topicId}`} className="btn btn-light">Open {weakest.topicName}</Link>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By topic</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {overview.byTopic.map((t) => (
              <div key={t.topicId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t.topicName}</span>
                  <strong style={{ color: t.accuracyPct < 50 ? 'var(--warm-accent)' : undefined }}>{t.accuracyPct}%</strong>
                </div>
                <ProgressBar value={t.accuracyPct} color={t.accuracyPct < 50 ? 'var(--warm-accent)' : t.accuracyPct < 70 ? '#b58a2f' : 'var(--success)'} />
              </div>
            ))}
            {overview.byTopic.length === 0 && <p className="muted">No PYQs attempted yet.</p>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">Mistake types, real PYQ misses</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {Object.entries(overview.mistakeTypeCounts).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{MISTAKE_LABEL[type] ?? type}</strong>
                  <span className="muted">{count}×</span>
                </div>
              ))}
              {Object.keys(overview.mistakeTypeCounts).length === 0 && <p className="muted">No open mistakes.</p>}
            </div>
            <Link href="/proto/mistakes" style={{ display: 'inline-block', marginTop: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Open the mistake book →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <Link href="/proto/pyqs/weak-areas" className="btn btn-primary">Practise weak-area PYQs</Link>
        <Link href="/proto/pyqs/previously-wrong" className="btn btn-secondary">Retry what I missed</Link>
        <Link href="/proto/tests" className="btn btn-secondary">Take a full mock instead</Link>
      </div>
    </AppShell>
  );
}
