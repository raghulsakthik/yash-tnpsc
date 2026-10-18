'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../_components/AppShell';
import { ProgressBar } from '../../_components/ui';

export default function PyqAnalysis() {
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

  if (error) {
    return (
      <AppShell>
        <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>
      </AppShell>
    );
  }

  if (!stats) {
    return (
      <AppShell>
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      </AppShell>
    );
  }

  const attemptedTopics = stats.byTopic.filter((t) => t.attempted > 0);
  const weakest = [...attemptedTopics].sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))[0];

  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/pyqs" style={{ color: 'var(--primary)', textDecoration: 'none' }}>PYQs</Link> / Analysis
      </div>
      <h1 style={{ marginTop: 10 }}>What {stats.totalQuestions} real past-year questions reveal</h1>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{stats.attempted}</div><div className="label">attempted</div></div>
          <div className="stat"><div className="num">{stats.totalQuestions}</div><div className="label">real questions on record</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--primary)' }}>{stats.accuracy !== null ? `${stats.accuracy}%` : '—'}</div><div className="label">accuracy</div></div>
        </div>
      </div>

      {weakest && (
        <div className="card-dark" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Weakest so far</span>
            <h2 style={{ color: '#fff', marginTop: 10 }}>{weakest.topicName} — {weakest.accuracy}% across {weakest.attempted} attempt{weakest.attempted === 1 ? '' : 's'}</h2>
          </div>
          <Link href={`/pyqs/${weakest.topicId}`} className="btn btn-light">Practise this topic</Link>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">By topic (attempted only)</span>
        {attemptedTopics.length === 0 && <p className="muted" style={{ marginTop: 12 }}>No past-year questions attempted yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {attemptedTopics.map((t) => (
            <div key={t.topicId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{t.topicName} <span className="muted" style={{ fontSize: '0.8rem' }}>({t.attempted}/{t.total})</span></span>
                <strong style={{ color: t.accuracy < 50 ? 'var(--warm-accent)' : undefined }}>{t.accuracy}%</strong>
              </div>
              <ProgressBar value={t.accuracy} color={t.accuracy < 50 ? 'var(--warm-accent)' : t.accuracy < 70 ? '#b58a2f' : 'var(--success)'} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <Link href="/pyqs/all" className="btn btn-primary">Practise more real PYQs</Link>
        <Link href="/mistakes" className="btn btn-secondary">Open the mistake book</Link>
      </div>
    </AppShell>
  );
}
