'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The weekly test: exam UX, deliberately different from QuestionSession.
 * All questions are visible via a palette, navigation is free, answers can
 * be marked for review, and nothing is revealed until the whole test is
 * submitted. Reuses the existing .card/.option/.primary/.muted tokens —
 * the only new piece is the palette, styled like the existing .confidence
 * button row.
 */
export default function TestSession() {
  const router = useRouter();
  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> { selectedIndex, markedForReview }
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
      router.push(`/test/${testId}/results`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main>
        <h1>Something broke</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (loading || !testId) {
    return (
      <main>
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

  return (
    <main>
      <div className="progress muted">
        <span>
          {answered} of {questions.length} answered
        </span>
        <span>{question.topicName}</span>
      </div>

      <div className="palette">
        {questions.map((q, index) => (
          <button key={q.questionId} data-state={paletteState(index)} onClick={() => setCurrent(index)}>
            {index + 1}
          </button>
        ))}
      </div>

      <div className="card">
        <p className="prompt">{question.prompt}</p>

        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={option}
              className="option"
              data-state={answers[question.questionId]?.selectedIndex === index ? 'selected' : 'idle'}
              onClick={() => saveAnswer(question.questionId, { selectedIndex: index })}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mark-review">
          <input
            type="checkbox"
            checked={Boolean(answers[question.questionId]?.markedForReview)}
            onChange={(e) => saveAnswer(question.questionId, { markedForReview: e.target.checked })}
          />
          Mark for review
        </label>

        <div className="test-nav">
          <button disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>
            Previous
          </button>
          <button disabled={current === questions.length - 1} onClick={() => setCurrent((n) => n + 1)}>
            Next
          </button>
        </div>

        <button className="primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit test'}
        </button>
      </div>
    </main>
  );
}
