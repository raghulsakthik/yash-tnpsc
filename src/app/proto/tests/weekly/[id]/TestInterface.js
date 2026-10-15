'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The real exam UX, driven by the same endpoints as
 * src/app/_components/TestSession.js (GET /api/tests/:id, POST
 * /api/tests/:id/answers on every select-or-mark, POST
 * /api/tests/:id/submit), rebuilt with the proto's grid-palette layout.
 */
export default function TestInterface({ testId }) {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const shownAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tests/${testId}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.message ?? 'Could not load this test');
        setQuestions(data.questions);
        const initial = {};
        for (const q of data.questions) {
          initial[q.questionId] = { selectedIndex: q.selectedIndex, markedForReview: q.markedForReview };
        }
        setAnswers(initial);
        shownAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const saveAnswer = useCallback(
    (questionId, patch) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: { ...prev[questionId], ...patch } };
        const entry = next[questionId];
        fetch(`/api/tests/${testId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            selectedIndex: entry.selectedIndex ?? null,
            markedForReview: entry.markedForReview ?? false,
            timeTakenMs: Date.now() - shownAt.current,
          }),
        }).catch(() => {});
        return next;
      });
    },
    [testId]
  );

  async function submit() {
    if (!window.confirm('Submit the test? You cannot change your answers afterward.')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tests/${testId}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not submit the test');
      router.push(`/proto/tests/weekly/${testId}/result`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

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
