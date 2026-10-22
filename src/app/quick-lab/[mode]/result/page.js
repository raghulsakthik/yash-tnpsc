'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function QuickLabResult() {
  const { mode } = useParams();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`quicklab:${mode}`);
      if (raw) setSummary(JSON.parse(raw));
    } catch {
      setSummary(null);
    }
  }, [mode]);

  if (!summary) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
        <p className="muted">No round to show yet.</p>
        <Link href={`/quick-lab/${mode}`} className="btn btn-primary" style={{ marginTop: 16 }}>Play a round</Link>
      </main>
    );
  }

  const { results, bestCombo } = summary;
  const correctCount = results.filter((r) => r.correct).length;
  const accuracy = Math.round((correctCount / results.length) * 100);
  const avgMs = Math.round(results.reduce((sum, r) => sum + r.timeTakenMs, 0) / results.length);
  const fastest = Math.min(...results.map((r) => r.timeTakenMs));

  return (
    <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
      <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
        {mode.replace(/-/g, ' ')}
      </span>
      <h1 style={{ marginTop: 14 }}>{accuracy >= 80 ? 'Sharp round' : accuracy >= 50 ? 'Decent round' : 'Room to grow'}</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {correctCount} of {results.length} correct, averaging {(avgMs / 1000).toFixed(1)}s per answer.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{accuracy}%</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="num">{(avgMs / 1000).toFixed(1)}s</div><div className="label">average answer</div></div>
          <div className="stat"><div className="num">{(fastest / 1000).toFixed(1)}s</div><div className="label">fastest</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>×{bestCombo}</div><div className="label">best combo</div></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {results.map((r, i) => (
          <div
            key={`${r.prompt}-${i}`}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}
          >
            <span style={{ color: r.correct ? 'inherit' : 'var(--warm-accent)' }}>
              {r.correct ? '✓' : '!'} {r.prompt}
            </span>
            <span className="muted">{(r.timeTakenMs / 1000).toFixed(1)}s</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <Link href={`/quick-lab/${mode}`} className="btn btn-primary">Play again</Link>
        <Link href="/quick-lab" className="btn btn-secondary">Back to Quick Lab</Link>
      </div>
    </main>
  );
}
