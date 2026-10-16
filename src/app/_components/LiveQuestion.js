'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * The real question/answer/feedback loop against the live backend — ported
 * from the original src/app/_components/QuestionSession.js, restyled with
 * the NOVA design tokens. Backend decides difficulty, correctness,
 * mistake classification and mastery updates; this only renders what it's
 * given and posts the answer. Shared by Practice, Revision and Mistakes.
 */
export default function LiveQuestion({
  nextQuestionUrl,
  submitUrl,
  mode,
  sessionLength = 10,
  emptyCode,
  emptyTitle = 'Nothing here right now',
  emptyMessage = 'Come back later.',
  topicLabel,
}) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confidence, setConfidence] = useState(null);
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
    setConfidence(null);
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
          confidence,
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
      <div className="card">
        <h3>Something broke</h3>
        <p className="muted" style={{ marginTop: 10 }}>{error}</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadNext}>
          Try again
        </button>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 12 }}>✦</div>
        <h3>{emptyTitle}</h3>
        <p className="muted" style={{ marginTop: 8 }}>{emptyMessage}</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Back home
        </Link>
      </div>
    );
  }

  if (answered >= sessionLength && result) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h3>Done for now</h3>
        <p style={{ marginTop: 12, fontSize: '1.1rem' }}>
          {correctCount} out of {answered} correct.
        </p>
        {result.state && (
          <p className="muted" style={{ marginTop: 8 }}>
            Difficulty is now at {result.state.difficulty.toFixed(2)} — {result.reason}.
          </p>
        )}
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Finish
        </Link>
      </div>
    );
  }

  if (!question) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="eyebrow">
          {(topicLabel || question.topicName) ? `${topicLabel || question.topicName} · ` : ''}
          Question {Math.min(answered + 1, sessionLength)} of {sessionLength}
        </span>
        <span className="badge badge-mastered">{question.difficulty}</span>
      </div>

      <h2 style={{ fontSize: '1.6rem', marginBottom: 20 }}>{question.prompt}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {question.options.map((option, index) => {
          let cls = 'option';
          if (result) {
            if (index === result.correctIndex) cls += ' option-correct';
            else if (index === selected) cls += ' option-incorrect';
          } else if (selected === index) {
            cls += ' option-selected';
          }
          return (
            <button
              key={option}
              type="button"
              className={cls}
              disabled={Boolean(result)}
              onClick={() => setSelected(index)}
            >
              <span className="option-letter">{LETTERS[index] ?? index + 1}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {!result && (
        <>
          <p className="muted" style={{ marginTop: 20, marginBottom: 10, fontSize: '0.85rem' }}>How sure are you?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                className="pill-tab"
                style={confidence === level ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
                onClick={() => setConfidence(level)}
              >
                {level}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" disabled={selected === null || loading} onClick={submit}>
            {loading ? 'Checking…' : 'Submit answer'}
          </button>
        </>
      )}

      {result && (
        <div className="card" style={{ marginTop: 20, background: result.correct ? 'var(--success-tint)' : 'var(--warm-tint)' }}>
          <span className="eyebrow" style={{ color: result.correct ? 'var(--success)' : 'var(--warm-accent)' }}>
            {result.correct ? 'Correct' : 'Not this time'}
          </span>
          {result.intervention && <p style={{ marginTop: 10, fontWeight: 600 }}>{result.intervention.message}</p>}
          <p style={{ marginTop: 10 }}>{result.explanation}</p>
          {result.trap && <p className="muted" style={{ marginTop: 8 }}>{result.trap}</p>}

          {!result.correct && !aiHint && !aiUnavailable && (
            <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={getAiHint} disabled={aiLoading}>
              {aiLoading ? 'Thinking…' : '✦ Why, exactly?'}
            </button>
          )}
          {aiHint && (
            <div className="card-tint" style={{ marginTop: 16 }}>
              <p>{aiHint}</p>
            </div>
          )}

          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadNext} disabled={loading}>
            Next question
          </button>
        </div>
      )}
    </div>
  );
}
