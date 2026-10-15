'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { startTest } from '../../../../api/tests.api';

export default function TestInstructions() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const data = await startTest();
      router.push(`/proto/tests/weekly/${data.testId}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  return (
    <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
      <span className="eyebrow">Weekly test</span>
      <h1 style={{ marginTop: 12 }}>Before you begin</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        25 questions, allocated across aptitude and reasoning by real exam weight.
        No negative marking. Read through once — then it starts.
      </p>
      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            'The timer is not tracked by this test yet — take the time you need.',
            'Navigate freely between questions using the palette on the right.',
            '"Mark for review" flags a question without clearing your answer.',
            'Nothing is revealed until you submit the whole test.',
            'Your answers save as you go, one request per selection.',
          ].map((rule, i) => (
            <div key={rule} style={{ display: 'flex', gap: 14 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunk)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--ink-muted)',
              }}>{i + 1}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-sunk" style={{ marginTop: 16 }}>
        <span className="eyebrow">Sections</span>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-mastered">Aptitude</span>
          <span className="badge badge-mastered">Reasoning</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <Link href="/proto/tests" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
        <button type="button" className="btn btn-primary" onClick={start} disabled={starting}>
          {starting ? 'Starting…' : 'Start the test'}
        </button>
      </div>
    </main>
  );
}
