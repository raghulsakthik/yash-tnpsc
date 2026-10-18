'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../_components/AppShell';
import { ProgressRing } from '../../_components/ui';

const STATE_STYLE = {
  mastered: { bg: 'var(--success-tint)', border: 'var(--success)', icon: '✓' },
  retained: { bg: 'var(--success-tint)', border: 'var(--success)', icon: '✓' },
  'near-mastery': { bg: 'var(--warm-tint)', border: 'var(--warm-accent)' },
  practising: { bg: 'var(--secondary-tint)', border: 'var(--primary)' },
  learning: { bg: 'var(--secondary-tint)', border: 'var(--primary)' },
  'revision-due': { bg: 'var(--secondary-tint)', border: 'var(--secondary)', icon: '↻' },
  'not-started': { bg: 'var(--paper-sunk)', border: 'var(--border)', dim: true },
};

export default function Subject({ params }) {
  const { subject: subjectSlug } = use(params);
  const [subject, setSubject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/learn/${subjectSlug}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load this subject');
        setSubject(data);
      })
      .catch((err) => setError(err.message));
  }, [subjectSlug]);

  if (error) {
    return (
      <AppShell>
        <div className="card" style={{ background: 'var(--warm-tint)' }}>
          <p>Could not load this subject: {error}</p>
        </div>
      </AppShell>
    );
  }

  if (!subject) {
    return (
      <AppShell>
        <p className="muted">Loading…</p>
      </AppShell>
    );
  }

  const mastered = subject.topics.filter((t) => t.state === 'mastered' || t.state === 'retained').length;
  const revisionDue = subject.topics.filter((t) => t.state === 'revision-due').length;
  const overallMastery = subject.topics.length
    ? Math.round(subject.topics.reduce((sum, t) => sum + t.mastery, 0) / subject.topics.length)
    : 0;

  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/learn" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Learn</Link> / {subject.name}
      </div>

      <div className="card" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem' }}>{subject.name}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            {subject.topics.length} topics in this subject.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="badge badge-mastered">{mastered} mastered</span>
            {revisionDue > 0 && <span className="badge badge-revision-due">{revisionDue} revision due</span>}
          </div>
        </div>
        <ProgressRing value={overallMastery} label="mastery" />
      </div>

      <div style={{ marginTop: 20 }}>
        <span className="eyebrow">Topics</span>
        {subject.topics.length === 0 && (
          <div className="card" style={{ marginTop: 14, background: 'var(--warm-tint)' }}>
            <p>No topics with content here yet. An admin can add some from the admin content tools -- bulk
              document upload, manual YAML, or (for English) the Dictionary API vocabulary generator.</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {subject.topics.map((t) => {
            const style = STATE_STYLE[t.state] || STATE_STYLE['not-started'];
            return (
              <Link key={t.slug} href={`/practice/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
                  border: `1px solid ${style.border}`, borderRadius: 14, background: style.bg,
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: style.border, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem',
                  }}>
                    {style.icon ?? t.n}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: style.dim ? 'var(--ink-muted)' : 'var(--ink)' }}>{t.name}</strong>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {t.attemptCount === 0 ? 'Not started yet' : `${t.mastery}% mastery · ${t.attemptCount} question${t.attemptCount === 1 ? '' : 's'} answered`}
                    </div>
                  </div>
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {t.attemptCount === 0 ? 'Start →' : 'Practise →'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
