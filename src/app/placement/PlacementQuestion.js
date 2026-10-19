'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function PlacementQuestion() {
  const router = useRouter();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> selectedIndex | null
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding/placement-quiz', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load the placement quiz');
        setQuestions(data.questions);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function finish(finalAnswers) {
    setSubmitting(true);
    let draft = { dailyGoalMinutes: 30, language: 'en' };
    try {
      const saved = sessionStorage.getItem('onboarding-draft');
      if (saved) draft = { ...draft, ...JSON.parse(saved) };
    } catch {
      // use defaults
    }

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          answers: Object.entries(finalAnswers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not finish onboarding');
      try {
        sessionStorage.setItem('onboarding-result', JSON.stringify(data));
      } catch {
        // the plan page just shows a simpler fallback without exact numbers
      }
      router.push('/placement/plan');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="card" style={{ marginTop: 24, background: 'var(--warm-tint)' }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!questions) {
    return <p className="muted" style={{ marginTop: 24 }}>Loading…</p>;
  }

  if (questions.length === 0) {
    // No published content anywhere yet -- don't block onboarding on an empty bank.
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <p>No questions are published yet, so there is nothing to check here.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => finish({})} disabled={submitting}>
          {submitting ? 'Finishing…' : 'Skip to my plan'}
        </button>
      </div>
    );
  }

  const q = questions[index];
  const selected = answers[q.questionId];

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow">{q.subjectName} · {index + 1} of {questions.length}</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>No timer</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 20 }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < index ? 'var(--success)' : i === index ? 'var(--primary)' : 'var(--border)',
          }} />
        ))}
      </div>
      <h3>{q.prompt}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {q.options.map((text, i) => (
          <button
            key={i}
            type="button"
            className={`option ${selected === i ? 'option-selected' : ''}`}
            onClick={() => setAnswers((prev) => ({ ...prev, [q.questionId]: i }))}
          >
            <span className="option-letter">{LETTERS[i] ?? i + 1}</span>
            <span>{text}</span>
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        This is not a test. It only finds where to start, so a lesson never assumes something you have not seen.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          type="button"
          className="muted"
          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', textDecoration: index === 0 ? 'none' : 'underline' }}
          disabled={index === 0}
          onClick={() => setIndex((n) => n - 1)}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={submitting}
          onClick={() => {
            const next = { ...answers };
            if (!(q.questionId in next)) next[q.questionId] = null; // "not sure" is a valid skip
            setAnswers(next);
            if (index + 1 < questions.length) setIndex((n) => n + 1);
            else finish(next);
          }}
        >
          {submitting ? 'Finishing…' : index + 1 < questions.length ? 'Next question' : 'See my plan'}
        </button>
      </div>
    </div>
  );
}
