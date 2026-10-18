'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';

export default function Pyqs() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/pyqs/stats', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load PYQ stats');
        setStats(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Previous year questions</span>
      <h1 style={{ marginTop: 10 }}>What they have actually asked</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
        Real transcribed questions from real papers, tagged to the same topics as your lessons. Every attempt
        counts towards the same mastery — these are not a separate scoreboard.
      </p>

      {error && <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!stats && !error && <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}

      {stats && (
        <>
          <div className="num" style={{ fontSize: '2.5rem', marginTop: 20 }}>{stats.attempted}</div>
          <span className="muted">of {stats.totalQuestions} real past-year questions attempted</span>

          <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>How you want to practise</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Link href="/pyqs/all" className="card" style={{ textDecoration: 'none', color: 'inherit', background: 'var(--secondary-tint)', border: '1px solid #d9d2fb' }}>
              <h3 style={{ fontSize: '1.1rem' }}>All years, all topics</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>Mixed, exam-style -- the broadest real practice.</p>
              <div style={{ marginTop: 14, fontWeight: 600, color: 'var(--primary)' }}>Start →</div>
            </Link>
            {stats.byTopic.slice(0, 5).map((t) => (
              <Link key={t.topicId} href={`/pyqs/${t.topicId}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{t.topicName}</h3>
                <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{t.total} real question{t.total === 1 ? '' : 's'} across every year on record.</p>
                <div style={{ marginTop: 14, fontWeight: 600, color: 'var(--primary)' }}>Start →</div>
              </Link>
            ))}
          </div>

          <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
            <div className="card">
              <span className="eyebrow">By year</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
                {stats.byYear.map((y) => (
                  <Link key={y.year} href={`/pyqs/all?year=${y.year}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong className="num">{y.year}</strong>
                      <span className="muted">{y.attempted} / {y.total}</span>
                    </div>
                    <ProgressBar value={(y.attempted / y.total) * 100} color={y.attempted ? 'var(--success)' : 'var(--border)'} />
                  </Link>
                ))}
                {stats.byYear.length === 0 && <p className="muted">No past-year questions tagged with a year yet.</p>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <span className="eyebrow">Every topic with real PYQs</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, maxHeight: 220, overflowY: 'auto' }}>
                  {stats.byTopic.map((t) => (
                    <Link key={t.topicId} href={`/pyqs/${t.topicId}`} style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
                      <span>{t.topicName}</span>
                      <span className="badge badge-mastered">{t.total}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/pyqs/analysis" className="card-dark" style={{ textDecoration: 'none' }}>
                <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your PYQ performance</span>
                <h3 style={{ color: '#fff', marginTop: 10 }}>
                  {stats.accuracy !== null ? `${stats.accuracy}% accuracy over ${stats.attempted} questions` : 'No attempts yet'}
                </h3>
                <span style={{ color: '#fff', fontWeight: 600, display: 'inline-block', marginTop: 10 }}>See the full breakdown →</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
