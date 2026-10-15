'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ProgressBar } from './ui';

const MASTERY_DIMENSIONS = [
  { key: 'concept', label: 'Concept understanding' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'speed', label: 'Speed' },
  { key: 'retention', label: 'Retention' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'confidence', label: 'Confidence calibration' },
];

/**
 * The real question/answer/feedback loop for the NOVA design — the proto
 * equivalent of src/app/_components/QuestionSession.js, same fetch/submit
 * contract (GET nextQuestionUrl, POST submitUrl, mode, idempotent
 * attemptId), rebuilt with proto's classes instead of globals.css so
 * /proto/practice, /proto/revision and /proto/mistakes can all drive one
 * real session loop through this. The backend still decides everything —
 * this only renders what it's given and posts the answer.
 */
export default function QuestionSession({
  nextQuestionUrl,
  submitUrl,
  mode,
  sessionLength = 10,
  emptyCode,
  emptyTitle = 'Nothing here right now',
  emptyMessage = 'Come back later.',
  backHref = '/proto/home',
}) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [aiHint, setAiHint] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const shownAt = useRef(Date.now());

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmpty(false);
    setSelected(null);
    setResult(null);
    setAiHint(null);
    setAiUnavailable(false);
    try {
      const res = await fetch(nextQuestionUrl, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        if (emptyCode && data.code === emptyCode) {
          setEmpty(true);
          return;
        }
        throw new Error(data.message ?? 'Could not load a question');
      }
      setQuestion(data);
      shownAt.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nextQuestionUrl, emptyCode]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function submit() {
    if (selected === null || !question) return;
    setLoading(true);
    try {
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: crypto.randomUUID(),
          questionId: question.questionId,
          selectedIndex: selected,
          timeTakenMs: Date.now() - shownAt.current,
          confidence: null,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not record that answer');
      setResult(data);
      setAnswered((n) => n + 1);
      if (data.correct) setCorrectCount((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function getAiHint() {
    if (!result || !question) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.questionId,
          selectedIndex: selected,
          mistakeType: result.mistakeType,
        }),
      });
      const data = await res.json();
      if (data.available) setAiHint(data.text);
      else setAiUnavailable(true);
    } catch {
      setAiUnavailable(true);
    } finally {
      setAiLoading(false);
    }
  }

  if (error) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <h1>Something broke</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={loadNext}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (empty) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <h1>{emptyTitle}</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{emptyMessage}</p>
          <Link href={backHref} className="btn btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>
            Back home
          </Link>
        </div>
      </main>
    );
  }

  if (answered >= sessionLength && result) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <h1>Done for now</h1>
        <div className="card">
          <p style={{ marginTop: 0, fontSize: '1.15rem' }}>
            {correctCount} out of {answered} correct.
          </p>
          {result.state && (
            <>
              <p className="muted">
                Difficulty is now at {result.state.difficulty.toFixed(2)} — {result.reason}.
              </p>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="eyebrow">What {Math.round(result.state.mastery * 100)}% mastery is made of</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {MASTERY_DIMENSIONS.map((d) => (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ minWidth: 170, fontSize: '0.9rem' }}>{d.label}</span>
                      <ProgressBar value={Math.round(result.state[d.key] * 100)} />
                      <strong style={{ fontSize: '0.85rem', minWidth: 36, textAlign: 'right' }}>
                        {Math.round(result.state[d.key] * 100)}%
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Link href={backHref} className="btn btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
            Finish
          </Link>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const optionClass = (index) => {
    if (!result) return `option${selected === index ? ' option-selected' : ''}`;
    if (index === result.correctIndex) return 'option option-correct';
    if (index === selected) return 'option option-incorrect';
    return 'option';
  };

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href={backHref} style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>
          ×
        </Link>
        <strong style={{ flex: 1 }}>
          {question.topicName ?? question.topicId} · {mode.toLowerCase()}
        </strong>
        <span className="badge badge-mastered">{question.difficulty}</span>
        <span className="muted">
          Question {Math.min(answered + 1, sessionLength)} of {sessionLength}
        </span>
      </div>

      <div style={{ paddingTop: 36 }}>
        <h1 style={{ marginTop: 10, fontSize: '2rem' }}>{question.prompt}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, maxWidth: 560 }}>
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              className={optionClass(index)}
              disabled={Boolean(result)}
              onClick={() => setSelected(index)}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        {!result && (
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-primary" disabled={selected === null || loading} onClick={submit}>
              {loading ? 'Checking…' : 'Submit answer'}
            </button>
            <button type="button" className="btn btn-ghost" disabled>
              ✦ I&apos;m struggling
            </button>
          </div>
        )}

        {result && (
          <div className="card" style={{ marginTop: 28 }}>
            <h3 style={{ color: result.correct ? 'var(--success)' : 'var(--warm-accent)' }}>
              {result.correct ? 'Correct' : 'Not quite'}
            </h3>
            {result.intervention && <p style={{ marginTop: 8 }}>{result.intervention.message}</p>}
            <p style={{ marginTop: 8 }}>{result.explanation}</p>
            {result.trap && <p className="muted">{result.trap}</p>}

            {!result.correct && !aiHint && !aiUnavailable && (
              <button type="button" className="btn btn-secondary" onClick={getAiHint} disabled={aiLoading}>
                {aiLoading ? 'Thinking…' : 'Why, exactly?'}
              </button>
            )}
            {aiHint && (
              <div className="card-sunk" style={{ marginTop: 14 }}>
                <p style={{ margin: 0 }}>{aiHint}</p>
              </div>
            )}
            {aiUnavailable && <p className="muted">No AI tutor configured — the explanation above is the full answer.</p>}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={loadNext} disabled={loading}>
                Next question
              </button>
            </div>
          </div>
        )}

        <div className="card-dark" style={{ marginTop: 20 }}>
          <h3 style={{ color: '#fff' }}>That&apos;s completely fine. How would you like to carry on?</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {['Explain it more simply', 'Teach me the prerequisite', 'Show another example', 'Slow this down', 'Try an easier question'].map(
              (opt) => (
                <button key={opt} type="button" className="btn btn-dark btn-sm" disabled>
                  {opt}
                </button>
              )
            )}
          </div>
          <p className="muted" style={{ marginTop: 16, fontSize: '0.8rem' }}>
            Nothing here costs you progress, and none of it is recorded as a failure.
          </p>
        </div>
      </div>
    </main>
  );
}
