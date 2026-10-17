'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * The real weekly-test session — ported from the original
 * src/app/_components/TestSession.js, restyled with the design
 * tokens (question palette, free navigation, mark-for-review, nothing
 * revealed until submit).
 */
export default function LiveTest() {
  const router = useRouter();
  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const shownAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tests', { method: 'POST' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.message ?? 'Could not start a test');
        setTestId(data.testId);
        setQuestions(data.questions);
        shownAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

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
      try {
        sessionStorage.setItem(`test-new-achievements:${testId}`, JSON.stringify(data.newAchievements ?? []));
      } catch {
        // sessionStorage can be unavailable (private mode); the result page just shows no banner.
      }
      router.push(`/tests/${testId}/result`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="card" style={{ margin: 24 }}>
        <h3>Something broke</h3>
        <p className="muted" style={{ marginTop: 10 }}>{error}</p>
      </div>
    );
  }

  if (loading || !testId) {
    return <p className="muted" style={{ padding: 24 }}>Preparing your test…</p>;
  }

  const question = questions[current];
  const answered = Object.values(answers).filter((a) => a.selectedIndex !== undefined && a.selectedIndex !== null).length;
  const marked = Object.values(answers).filter((a) => a.markedForReview).length;

  const paletteState = (index) => {
    const a = answers[questions[index].questionId];
    if (a?.selectedIndex !== undefined && a?.selectedIndex !== null) return 'answered';
    return 'idle';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: '100vh' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <strong>Weekly Test</strong>
            <div className="muted" style={{ fontSize: '0.85rem' }}>{questions.length} questions · no negative marking</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit test'}
          </button>
        </div>

        <div style={{ padding: '32px 28px' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            QUESTION {current + 1} OF {questions.length} · {(question.topicName || '').toUpperCase()}
          </span>
          <h2 style={{ marginTop: 10 }}>{question.prompt}</h2>

          {question.imageData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageData}
              alt="Figure for this question"
              style={{ display: 'block', maxWidth: '100%', marginTop: 16, borderRadius: 10, border: '1px solid var(--border)' }}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, maxWidth: 560 }}>
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                className={`option ${answers[question.questionId]?.selectedIndex === index ? 'option-selected' : ''}`}
                onClick={() => saveAnswer(question.questionId, { selectedIndex: index })}
              >
                <span className="option-letter">{LETTERS[index] ?? index + 1}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(answers[question.questionId]?.markedForReview)}
              onChange={(e) => saveAnswer(question.questionId, { markedForReview: e.target.checked })}
            />
            <span className="muted">Mark for review</span>
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>
              ← Previous
            </button>
            <button type="button" className="btn btn-secondary" disabled={current === questions.length - 1} onClick={() => setCurrent((n) => n + 1)}>
              Next →
            </button>
          </div>
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--border)', padding: 24 }}>
        <span className="eyebrow">Question palette</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14 }}>
          {questions.map((q, index) => {
            const state = paletteState(index);
            const isCurrent = index === current;
            return (
              <button
                key={q.questionId}
                type="button"
                onClick={() => setCurrent(index)}
                style={{
                  aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: state === 'answered' ? 'var(--primary)' : 'var(--paper-raised)',
                  color: state === 'answered' ? '#fff' : 'var(--ink-muted)',
                  border: isCurrent ? '2px solid var(--ink)' : answers[q.questionId]?.markedForReview ? '1px solid var(--secondary)' : '1px solid var(--border)',
                }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, fontSize: '0.85rem' }}>
          <span><span style={{ color: 'var(--primary)' }}>■</span> Answered · {answered}</span>
          <span><span style={{ color: 'var(--secondary)' }}>■</span> Marked for review · {marked}</span>
          <span><span className="muted">■</span> Not visited · {questions.length - answered}</span>
        </div>
      </div>
    </div>
  );
}
