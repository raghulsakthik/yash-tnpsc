'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTestDetail } from '../../../../../../hooks/useTestDetail';

export default function TestReview({ params }) {
  const { id } = use(params);
  const [current, setCurrent] = useState(0);
  const { test, error } = useTestDetail(id);
  const questions = test?.questions ?? null;

  if (error) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <p>{error}</p>
      </main>
    );
  }
  if (!questions) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const q = questions[current];
  const correct = q.selectedIndex === q.correctIndex;

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/proto/tests/weekly/${id}/result`} style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ flex: 1 }}>Weekly Test · Review</strong>
        <span className="muted">Question {current + 1} of {questions.length}</span>
      </div>

      <div style={{ paddingTop: 30 }}>
        <span className="eyebrow">{q.topicName}</span>
        <h1 style={{ marginTop: 10, fontSize: '1.8rem' }}>{q.prompt}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {q.options.map((text, i) => {
            const isCorrect = i === q.correctIndex;
            const isChosen = i === q.selectedIndex;
            let cls = 'option';
            if (isCorrect) cls += ' option-correct';
            else if (isChosen) cls += ' option-incorrect';
            return (
              <div key={text} className={cls} style={{ cursor: 'default' }}>
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <span>{text}</span>
                {isCorrect && (
                  <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {isChosen ? 'Your answer · correct' : 'Answer'}
                  </span>
                )}
                {isChosen && !isCorrect && (
                  <span style={{ marginLeft: 'auto', color: 'var(--warm-accent)', fontWeight: 600, fontSize: '0.85rem' }}>Your answer</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="card-sunk" style={{ marginTop: 20, background: correct ? 'var(--success-tint)' : 'var(--warm-tint)' }}>
          <span className="eyebrow" style={{ color: correct ? 'var(--success)' : 'var(--warm-accent)' }}>
            {correct ? 'Correct' : 'Not quite'}
          </span>
          <p style={{ marginTop: 8 }}>{q.explanation}</p>
          {!correct && q.trap && <p className="muted" style={{ marginTop: 8 }}>{q.trap}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>
            ← Previous
          </button>
          {current < questions.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setCurrent((n) => n + 1)}>
              Next →
            </button>
          ) : (
            <Link href={`/proto/tests/weekly/${id}/result`} className="btn btn-primary">Back to result</Link>
          )}
        </div>
      </div>
    </main>
  );
}
