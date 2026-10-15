'use client';

import { use } from 'react';
import Link from 'next/link';
import { ProgressRing, ProgressBar } from '../../../../_components/ui';
import { useTestDetail } from '../../../../../../hooks/useTestDetail';

export default function TestResult({ params }) {
  const { id } = use(params);
  const { test, error } = useTestDetail(id);

  if (error) {
    return (
      <main className="shell-main" style={{ maxWidth: 1000, paddingTop: 48 }}>
        <p>{error}</p>
      </main>
    );
  }
  if (!test) {
    return (
      <main className="shell-main" style={{ maxWidth: 1000, paddingTop: 48 }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const total = test.questionCount;
  const score = Math.round((test.score / 100) * total);
  const incorrect = total - score;
  const accuracy = `${Math.round(test.score)}%`;

  const byTopic = new Map();
  let slowWrong = 0;
  for (const q of test.questions) {
    const key = q.topicName ?? q.topicId;
    if (!byTopic.has(key)) byTopic.set(key, { name: key, score: 0, total: 0 });
    const entry = byTopic.get(key);
    entry.total += 1;
    const correct = q.selectedIndex === q.correctIndex;
    if (correct) entry.score += 1;
    if (q.timeTakenMs && q.estimatedSeconds && q.timeTakenMs > q.estimatedSeconds * 1000 * 1.5 && !correct) {
      slowWrong += 1;
    }
  }
  const bySubject = [...byTopic.values()];
  const strong = bySubject.filter((s) => s.score === s.total).map((s) => s.name);
  const needsWork = bySubject.filter((s) => s.score < s.total).map((s) => s.name);

  return (
    <main className="shell-main" style={{ maxWidth: 1000, paddingTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <span className="badge badge-learning">WEEKLY TEST</span>
          <h1 style={{ marginTop: 14 }}>{score} out of {total}</h1>
        </div>
        <ProgressRing value={Math.round(test.score)} label="score" size={110} />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{total}</div><div className="label">attempted</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{score}</div><div className="label">correct</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{incorrect}</div><div className="label">incorrect</div></div>
          <div className="stat"><div className="num">{accuracy}</div><div className="label">accuracy</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By topic</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {bySubject.map((s) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{s.name}</span>
                  <strong>{s.score}/{s.total}</strong>
                </div>
                <ProgressBar value={(s.score / s.total) * 100} color="var(--success)" />
              </div>
            ))}
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="card-sunk" style={{ background: 'var(--success-tint)' }}>
              <span className="eyebrow" style={{ color: 'var(--success)' }}>Strong</span>
              <p style={{ marginTop: 6, fontSize: '0.9rem' }}>{strong.length > 0 ? strong.join(', ') : '—'}</p>
            </div>
            <div className="card-sunk" style={{ background: 'var(--warm-tint)' }}>
              <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Needs work</span>
              <p style={{ marginTop: 6, fontSize: '0.9rem' }}>{needsWork.length > 0 ? needsWork.join(', ') : '—'}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">What the paper says</span>
          <p style={{ marginTop: 10 }}>
            {slowWrong > 0
              ? `${slowWrong} of your ${incorrect} misses took noticeably longer than expected — worth revisiting those topics first.`
              : incorrect > 0
                ? 'Your misses were at a normal pace — likely a method gap rather than a timing one.'
                : 'No misses this time.'}
          </p>
          <Link href="/proto/revision" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 14 }}>
            Start the revision
          </Link>
        </div>
      </div>

      <Link href={`/proto/tests/weekly/${id}/review`} className="btn btn-secondary btn-block" style={{ marginTop: 20 }}>
        Review every answer
      </Link>
    </main>
  );
}
