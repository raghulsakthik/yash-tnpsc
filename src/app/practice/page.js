'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';

function stateColor(state) {
  if (state === 'mastered' || state === 'retained') return 'var(--success)';
  if (state === 'revision-due') return 'var(--secondary)';
  if (state === 'not-started') return 'var(--ink-muted)';
  return 'var(--primary)';
}

/**
 * The practice landing page the "Practice" nav tab was missing -- before
 * this, tapping it dropped straight into a practice session for a
 * hardcoded topic with zero context. Now: a combined/mixed option across
 * every topic with content, plus the full real topic list grouped by
 * subject, same data /learn already shows.
 */
export default function PracticeLanding() {
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/learn', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(async ({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load subjects');
        const withTopics = await Promise.all(
          d.subjects.map((s) =>
            fetch(`/api/learn/${s.slug}`, { cache: 'no-store' })
              .then((res) => (res.ok ? res.json() : { slug: s.slug, name: s.name, topics: [] }))
              .catch(() => ({ slug: s.slug, name: s.name, topics: [] }))
          )
        );
        setSubjects(withTopics);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Practice</span>
      <h1 style={{ marginTop: 10 }}>Pick a topic, or practise everything</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
        Individual topics for focused work, or mixed practice that draws from every topic with real content,
        weighted the same way a real paper is.
      </p>

      <Link
        href="/practice/mixed"
        className="card"
        style={{ display: 'block', marginTop: 20, textDecoration: 'none', color: 'inherit', background: 'var(--secondary-tint)', border: '1px solid #d9d2fb' }}
      >
        <h3 style={{ fontSize: '1.2rem' }}>⚡ Mixed practice -- all topics combined</h3>
        <p className="muted" style={{ marginTop: 8 }}>Every question drawn from a different real topic, weighted by real exam weight.</p>
        <div style={{ marginTop: 14, fontWeight: 600, color: 'var(--primary)' }}>Start →</div>
      </Link>

      {error && <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!subjects && !error && <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}

      {subjects?.map((subject) => (
        <div key={subject.slug ?? subject.id} style={{ marginTop: 28 }}>
          <span className="eyebrow">{subject.name}</span>
          <div className="grid-3" style={{ marginTop: 12 }}>
            {(subject.topics ?? []).length === 0 ? (
              <p className="muted">No topics with content yet in this subject.</p>
            ) : (
              subject.topics.map((t) => (
                <Link
                  key={t.slug ?? t.id}
                  href={`/practice/${t.slug ?? t.id}`}
                  className="card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <strong>{t.name}</strong>
                  <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                    {t.attemptCount > 0 ? `${t.mastery}% mastery · ${t.attemptCount} answered` : 'Not started yet'}
                  </p>
                  <span style={{ display: 'inline-block', marginTop: 10, fontWeight: 600, fontSize: '0.85rem', color: stateColor(t.state) }}>
                    {t.state === 'revision-due' ? 'Review' : t.attemptCount > 0 ? 'Continue →' : 'Start →'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
