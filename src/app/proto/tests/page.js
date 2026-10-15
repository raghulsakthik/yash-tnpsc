'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { listTests } from '../../../api/tests.api';

export default function Tests() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listTests()
      .then((data) => !cancelled && setItems(data.items ?? []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Tests</span>
      <h1 style={{ marginTop: 10 }}>Find out where you stand</h1>
      <p className="muted" style={{ marginTop: 10 }}>A test is a measurement, not a verdict. Everything you get wrong turns into revision rather than a number you carry around.</p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load your tests: {error}</p>
        </div>
      )}

      <div className="card-tint" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="badge" style={{ background: 'var(--primary)', color: '#fff' }}>WEEKLY TEST</span>
          <h2 style={{ marginTop: 12 }}>Start a weekly test</h2>
          <p className="muted" style={{ marginTop: 8, maxWidth: 560 }}>
            25 questions, drawn from everything you have touched, weighted towards real exam weight.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <span className="badge" style={{ background: '#fff' }}>Aptitude</span>
            <span className="badge" style={{ background: '#fff' }}>Reasoning</span>
          </div>
        </div>
        <Link href="/proto/tests/instructions" className="btn btn-primary">Begin test</Link>
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Or choose your own</span>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { name: 'Quick test', desc: '10 questions, 12 minutes.' },
          { name: 'Subject test', desc: '25 questions from one subject.' },
          { name: 'Chapter test', desc: '15 questions on a single chapter.' },
          { name: 'Full mock', desc: '100 questions, 150 minutes.' },
        ].map((o) => (
          <div key={o.name} className="card" style={{ opacity: 0.6 }}>
            <h3 style={{ fontSize: '1.1rem' }}>{o.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{o.desc}</p>
            <hr className="rule" style={{ margin: '14px 0 10px' }} />
            <span className="muted" style={{ fontSize: '0.85rem' }}>Not available yet</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">Previous tests</span>
        <div style={{ marginTop: 12 }}>
          {items === null && <p className="muted">Loading…</p>}
          {items && items.length === 0 && <p className="muted">No tests taken yet.</p>}
          {items && items.map((t, i) => (
            <div key={t.testId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0',
              borderTop: i ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <strong>{t.status === 'COMPLETED' ? 'Weekly test' : 'In progress'}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  {new Date(t.startedAt).toLocaleDateString()} · {t.questionCount} questions
                </div>
              </div>
              <Link
                href={t.status === 'COMPLETED' ? `/proto/tests/weekly/${t.testId}/result` : `/proto/tests/weekly/${t.testId}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                {t.status === 'COMPLETED' && <span className="badge badge-difficulty">{Math.round(t.score)}%</span>}
                <span className="muted">›</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
