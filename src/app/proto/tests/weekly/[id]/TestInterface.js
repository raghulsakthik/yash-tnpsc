'use client';

import { useTest } from '../../../../../hooks/useTest';

/**
 * The real exam UX, driven by the same endpoints as
 * src/app/_components/TestSession.js (GET /api/tests/:id, POST
 * /api/tests/:id/answers on every select-or-mark, POST
 * /api/tests/:id/submit), rebuilt with the proto's grid-palette layout.
 * All state/fetching lives in src/hooks/useTest.js.
 */
export default function TestInterface({ testId }) {
  const { questions, answers, current, setCurrent, loading, submitting, error, saveAnswer, submit } = useTest(testId);

  if (error) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <h1>Something broke</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (loading || questions.length === 0) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <p className="muted">Preparing your test…</p>
      </main>
    );
  }

  const question = questions[current];
  const answered = Object.values(answers).filter((a) => a.selectedIndex !== undefined && a.selectedIndex !== null).length;

  const paletteState = (index) => {
    if (index === current) return 'current';
    const a = answers[questions[index].questionId];
    if (a?.markedForReview) return 'marked';
    if (a?.selectedIndex !== undefined && a?.selectedIndex !== null) return 'answered';
    return 'idle';
  };

  const paletteColor = {
    current: 'var(--primary)',
    marked: 'var(--secondary)',
    answered: '#fff',
    idle: 'var(--paper-sunk)',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: '100vh' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <strong>TNPSC Weekly Test</strong>
            <div className="muted" style={{ fontSize: '0.85rem' }}>{questions.length} questions · no negative marking</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit test'}
          </button>
        </div>

        <div style={{ padding: '32px 28px' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            QUESTION {current + 1} OF {questions.length} · {(question.topicName ?? '').toUpperCase()}
          </span>
          <h2 style={{ marginTop: 10 }}>{question.prompt}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, maxWidth: 560 }}>
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                className={`option ${answers[question.questionId]?.selectedIndex === index ? 'option-selected' : ''}`}
                onClick={() => saveAnswer(question.questionId, { selectedIndex: index })}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => saveAnswer(question.questionId, { markedForReview: !answers[question.questionId]?.markedForReview })}
            >
              {answers[question.questionId]?.markedForReview ? 'Unmark review' : 'Mark for review'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => saveAnswer(question.questionId, { selectedIndex: null })}>
              Clear answer
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              disabled={current === questions.length - 1}
              onClick={() => setCurrent((n) => n + 1)}
            >
              Save &amp; next →
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--border)', padding: 24 }}>
        <span className="eyebrow">Question palette</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14 }}>
          {questions.map((q, i) => {
            const state = paletteState(i);
            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => setCurrent(i)}
                style={{
                  height: 36,
                  borderRadius: 8,
                  border: state === 'current' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paletteColor[state],
                  color: state === 'answered' ? 'var(--ink)' : state === 'idle' ? 'var(--ink-muted)' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 16, fontSize: '0.85rem' }}>
          {answered} of {questions.length} answered
        </p>
      </div>
    </div>
  );
}
