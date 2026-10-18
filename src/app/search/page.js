'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) throw new Error(d.message ?? 'Search failed');
          setResults(d);
          setError(null);
        })
        .catch((err) => setError(err.message));
    }, 250); // debounce -- avoid a DB round-trip on every keystroke
    return () => clearTimeout(handle);
  }, [q]);

  const totalResults = results ? results.topics.length + results.lessons.length + results.questions.length : 0;

  return (
    <AppShell>
      <span className="eyebrow">Search</span>
      <h1 style={{ marginTop: 10 }}>Find a topic, lesson or question</h1>

      <input
        type="text"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search topics, lessons, questions…"
        style={{
          width: '100%', marginTop: 20, padding: '14px 18px', fontSize: '1.05rem',
          borderRadius: 14, border: '1px solid var(--border)', background: 'var(--paper-raised)',
        }}
      />

      {error && <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      {q.trim().length >= 2 && results && totalResults === 0 && (
        <p className="muted" style={{ marginTop: 20 }}>No matches for &quot;{q}&quot;.</p>
      )}

      {results?.topics.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <span className="eyebrow">Topics</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {results.topics.map((t) => (
              <Link key={t.topicId} href={`/practice/${t.topicId}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{t.name}</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.82rem' }}>{t.subjectName} / {t.chapterName}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results?.lessons.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <span className="eyebrow">Lessons</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {results.lessons.map((l) => (
              <Link key={l.topicId} href={`/lesson/${l.topicId}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{l.title}</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.82rem' }}>{l.snippet}…</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {results?.questions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <span className="eyebrow">Questions</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {results.questions.map((q2) => (
              <Link key={q2.questionId} href={`/practice/${q2.topicId}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <p style={{ fontSize: '0.92rem' }}>{q2.prompt}</p>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.78rem' }}>{q2.topicName}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
