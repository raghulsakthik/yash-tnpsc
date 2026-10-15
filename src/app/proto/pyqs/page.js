'use client';

import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';
import { usePyqsOverview } from '../../../hooks/usePyqsOverview';

const modes = [
  { name: 'Weak areas', desc: 'Drawn from your weakest topics.', warm: true, slug: 'weak-areas' },
  { name: 'Previously wrong', desc: 'Only PYQs you have missed before.', slug: 'previously-wrong' },
];

export default function Pyqs() {
  const { overview, error } = usePyqsOverview();

  return (
    <AppShell>
      <span className="eyebrow">Previous year questions</span>
      <h1 style={{ marginTop: 10 }}>What they have actually asked</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
        Real papers, tagged to the same topics as your lessons. Every attempt counts
        towards the same mastery — these are not a separate scoreboard.
      </p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load PYQ stats: {error}</p>
        </div>
      )}
      <div className="num" style={{ fontSize: '2.5rem', marginTop: 20 }}>{overview?.attempted ?? '—'}</div>
      <span className="muted">questions attempted</span>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>How you want to practise</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {overview?.byTopic?.slice(0, 4).map((t) => (
          <Link
            key={t.topicId}
            href={`/proto/pyqs/${t.topicId}`}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <h3 style={{ fontSize: '1.1rem' }}>{t.topicName}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
              {t.attempted} attempted · {t.accuracyPct}% accuracy
            </p>
            <div style={{ marginTop: 14, fontWeight: 600, color: 'var(--primary)' }}>Practise →</div>
          </Link>
        ))}
        {modes.map((m) => (
          <Link
            key={m.slug}
            href={`/proto/pyqs/${m.slug}`}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit', background: m.warm ? 'var(--warm-tint)' : undefined }}
          >
            <h3 style={{ fontSize: '1.1rem' }}>{m.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{m.desc}</p>
            <div style={{ marginTop: 14, fontWeight: 600, color: m.warm ? 'var(--warm-accent)' : 'var(--primary)' }}>Start →</div>
          </Link>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By year</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
            {overview?.byYear.map((y) => (
              <div key={y.year}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong className="num">{y.year}</strong>
                  <span className="muted">{y.correct} / {y.attempted}</span>
                </div>
                <ProgressBar value={y.accuracyPct} color={y.attempted ? 'var(--success)' : 'var(--border)'} />
              </div>
            ))}
            {overview && overview.byYear.length === 0 && <p className="muted">No PYQs attempted yet.</p>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">What keeps coming back</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {overview?.topicFrequency?.slice(0, 4).map((t) => (
                <div key={t.topicId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.topicName}</span>
                  <span className="badge badge-difficulty">{t.questionCount} in the bank</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/proto/pyqs/analysis" className="card-dark" style={{ textDecoration: 'none' }}>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your PYQ performance</span>
            <h3 style={{ color: '#fff', marginTop: 10 }}>
              {overview ? `${overview.accuracyPct}% accuracy over ${overview.attempted} questions` : 'Loading…'}
            </h3>
            <span style={{ color: '#fff', fontWeight: 600, display: 'inline-block', marginTop: 10 }}>See the full analysis →</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
