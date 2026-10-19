'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { StarIcon } from '../_components/Icon';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState(null);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState({});

  function load() {
    fetch('/api/bookmarks', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load bookmarks');
        setBookmarks(d.bookmarks);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function remove(questionId) {
    setBookmarks((prev) => prev.filter((b) => b.questionId !== questionId));
    try {
      await fetch(`/api/bookmarks/${questionId}`, { method: 'DELETE' });
    } catch {
      load(); // revert by reloading the real state on failure
    }
  }

  return (
    <AppShell>
      <span className="eyebrow">Saved for later</span>
      <h1 style={{ marginTop: 10 }}>Bookmarked questions</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Starred from practice, revision, mistakes, a test, or a PYQ -- outside whatever the selection
        algorithm would otherwise show you next.
      </p>

      {error && <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!bookmarks && !error && <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}
      {bookmarks?.length === 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Nothing saved yet -- tap the <StarIcon style={{ display: 'inline' }} /> on any question to keep it here.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {bookmarks?.map((b) => (
          <div key={b.questionId} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span className="eyebrow">{b.topicName}</span>
                <p style={{ marginTop: 8, fontWeight: 600 }}>{b.prompt}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(b.questionId)}
                aria-label="Remove bookmark"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warm-accent)', lineHeight: 1, display: 'flex' }}
              >
                <StarIcon filled />
              </button>
            </div>

            {revealed[b.questionId] ? (
              <>
                <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: '0.9rem' }}>
                  {b.options.map((o, i) => (
                    <li key={i} style={{ fontWeight: i === b.correctIndex ? 700 : 400, color: i === b.correctIndex ? 'var(--success)' : 'inherit' }}>
                      {LETTERS[i] ?? i + 1}. {o}
                    </li>
                  ))}
                </ul>
                <p className="muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>{b.explanation}</p>
              </>
            ) : (
              <button
                type="button"
                className="muted"
                style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 10, fontSize: '0.85rem', padding: 0 }}
                onClick={() => setRevealed((r) => ({ ...r, [b.questionId]: true }))}
              >
                Show answer
              </button>
            )}

            <Link
              href={`/practice/${b.topicId}`}
              style={{ display: 'inline-block', marginTop: 12, color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}
            >
              Practise this topic →
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
