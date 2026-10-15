'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getQuickLabResult } from '../../../../../api/quickLab.api';

export default function QuickLabResult({ params }) {
  const { mode } = use(params);
  const sessionId = useSearchParams().get('session');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No round to show — start one from Quick Lab.');
      return;
    }
    let cancelled = false;
    getQuickLabResult(sessionId)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
        <p>{error}</p>
        <Link href="/proto/quick-lab" className="btn btn-secondary">Back to Quick Lab</Link>
      </main>
    );
  }
  if (!result) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const stats = [
    { label: 'accuracy', value: `${result.accuracyPct}%`, color: 'var(--success)' },
    { label: 'average answer', value: `${result.avgSeconds}s` },
    { label: 'best combo', value: `×${result.bestCombo}` },
    { label: 'correct', value: `${result.correctCount}/${result.questionCount}` },
    { label: 'XP', value: `+${result.xp}`, color: 'var(--warm-accent)' },
  ];

  return (
    <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
      <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>{result.modeName}</span>
      <h1 style={{ marginTop: 14 }}>
        {result.accuracyPct >= 80 ? 'Strong round' : result.accuracyPct >= 50 ? 'Decent round' : 'Room to sharpen this'}
      </h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {result.correctCount} of {result.questionCount} correct, averaging {result.avgSeconds}s per answer.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="num" style={{ color: s.color ?? 'inherit' }}>{s.value}</div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-tint" style={{ marginTop: 16 }}>
        <span className="eyebrow" style={{ color: 'var(--secondary)' }}>✦ What this changed</span>
        <p style={{ marginTop: 10 }}>
          Every answer in this round went through the same grading pipeline Practice
          uses — your {result.modeName.toLowerCase()} difficulty and mastery moved
          from it, same as any other practice session.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <Link href={`/proto/quick-lab/${mode}`} className="btn btn-primary">Play again</Link>
        <Link href="/proto/quick-lab" className="btn btn-secondary">Back to Quick Lab</Link>
      </div>
    </main>
  );
}
