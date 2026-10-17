'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

export default function Lesson({ params }) {
  const { topic } = use(params);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [altExplanation, setAltExplanation] = useState(null);
  const [altName, setAltName] = useState(null);
  const [altLoading, setAltLoading] = useState(false);
  const [altUnavailable, setAltUnavailable] = useState(false);

  useEffect(() => {
    setLesson(null);
    setError(null);
    setAltExplanation(null);
    setAltUnavailable(false);
    fetch(`/api/lesson/${topic}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'No lesson for this topic yet');
        setLesson(data);
      })
      .catch((err) => setError(err.message));
  }, [topic]);

  async function explainDifferently() {
    setAltLoading(true);
    try {
      const res = await fetch(`/api/lesson/${topic}/explain`, { method: 'POST' });
      const data = await res.json();
      if (data.available) {
        setAltExplanation(data.text);
        setAltName(data.learnerName ?? null);
      } else {
        setAltUnavailable(true);
      }
    } catch {
      setAltUnavailable(true);
    } finally {
      setAltLoading(false);
    }
  }

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/practice/${topic}`} style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong>{lesson?.title ?? 'Lesson'}</strong>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 24, background: 'var(--warm-tint)' }}>
          <p>{error}</p>
          <Link href={`/practice/${topic}`} className="btn btn-secondary" style={{ marginTop: 14 }}>Back to practice</Link>
        </div>
      )}

      {!error && !lesson && <p className="muted" style={{ marginTop: 24 }}>Loading…</p>}

      {lesson && (
        <div style={{ paddingTop: 40 }}>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>The idea</span>
          <h1 style={{ marginTop: 10 }}>{lesson.title}</h1>
          <p style={{ marginTop: 16, fontSize: '1.05rem' }}>{lesson.concept}</p>

          <div className="card-tint" style={{ marginTop: 24 }}>
            <span className="eyebrow" style={{ color: 'var(--secondary)' }}>Worked example</span>
            <p style={{ marginTop: 10, fontWeight: 600 }}>{lesson.example.problem}</p>
            <ol style={{ marginTop: 10, paddingLeft: 20 }}>
              {lesson.example.steps.map((step, i) => (
                <li key={i} style={{ marginTop: 6 }}>{step}</li>
              ))}
            </ol>
            <div className="num" style={{ fontSize: '1.3rem', color: 'var(--primary)', marginTop: 14 }}>
              Answer: {lesson.example.answer}
            </div>
          </div>

          <div className="card" style={{ marginTop: 20, borderLeft: '3px solid var(--warm-accent)' }}>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Common mistake</span>
            <p style={{ marginTop: 10 }}>{lesson.tip}</p>
          </div>

          {!altExplanation && !altUnavailable && (
            <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={explainDifferently} disabled={altLoading}>
              {altLoading ? 'Thinking…' : '✦ Explain this differently'}
            </button>
          )}
          {altExplanation && (
            <div className="card-tint" style={{ marginTop: 16 }}>
              <span className="eyebrow" style={{ color: 'var(--secondary)' }}>
                {altName ? `✦ ${altName}, here's another angle` : 'Another angle'}
              </span>
              <p style={{ marginTop: 10 }}>{altExplanation}</p>
            </div>
          )}

          <Link href={`/practice/${topic}`} className="btn btn-primary btn-block" style={{ marginTop: 28 }}>
            Practice this now
          </Link>
        </div>
      )}
    </main>
  );
}
