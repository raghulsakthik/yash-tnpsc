'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * The question/answer/feedback loop, generalized from slice 1's practice
 * screen so /practice and /revision ("Memory Echo") share one
 * implementation instead of two copies of the same state machine. The
 * backend still decides everything — difficulty, next action, revision
 * scheduling; this only renders what it's given and posts the answer.
 *
 * @param {object} props
 * @param {string} props.nextQuestionUrl
 * @param {string} props.submitUrl
 * @param {'PRACTICE'|'REVISION'} props.mode
 * @param {number} [props.sessionLength]
 * @param {string} [props.emptyCode] a GET error code treated as "nothing to do", not a failure
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyMessage]
 */
export default function QuestionSession({
  nextQuestionUrl,
  submitUrl,
  mode,
  sessionLength = 10,
  emptyCode,
  emptyTitle = 'Nothing here right now',
  emptyMessage = 'Come back later.',
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
          // Generated client side so a flaky connection and a retry cannot
          // record the same answer twice.
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
      <main>
        <h1>Something broke</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
          <button className="primary" onClick={loadNext}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (empty) {
    return (
      <main>
        <h1>{emptyTitle}</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{emptyMessage}</p>
          <Link
            href="/"
            className="primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '24px' }}
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  if (answered >= sessionLength && result) {
    return (
      <main>
        <h1>Done for now</h1>
        <div className="card">
          <p style={{ marginTop: 0, fontSize: '1.15rem' }}>
            {correctCount} out of {answered} correct.
          </p>
          {result.state && (
            <p className="muted">
              Difficulty is now at {result.state.difficulty.toFixed(2)} — {result.reason}.
            </p>
          )}
          <Link
            href="/"
            className="primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '24px' }}
          >
            Finish
          </Link>
        </div>
      </main>
    );
  }

  if (!question) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const optionState = (index) => {
    if (!result) return selected === index ? 'selected' : 'idle';
    if (index === result.correctIndex) return 'correct';
    if (index === selected) return 'wrong';
    return 'idle';
  };

  return (
    <main>
      <div className="progress muted">
        <span>
          {question.topicName ? `${question.topicName} — ` : ''}
          Question {Math.min(answered + 1, sessionLength)} of {sessionLength}
        </span>
        <span>{question.difficulty.toLowerCase()}</span>
      </div>

      <div className="card">
        <p className="prompt">{question.prompt}</p>

        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={option}
              className="option"
              data-state={optionState(index)}
              disabled={Boolean(result)}
              onClick={() => setSelected(index)}
            >
              {option}
            </button>
          ))}
        </div>

        {!result && (
          <>
            <p className="muted" style={{ marginBottom: 0, marginTop: 20 }}>
              How sure are you?
            </p>
            <div className="confidence">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  aria-pressed={confidence === level}
                  onClick={() => setConfidence(level)}
                >
                  {level}
                </button>
              ))}
            </div>

            <button className="primary" disabled={selected === null || loading} onClick={submit}>
              {loading ? 'Checking…' : 'Submit'}
            </button>
          </>
        )}

        {result && (
          <div className="feedback">
            <p className="verdict" data-correct={String(result.correct)}>
              {result.correct ? 'Correct' : 'Not this time'}
            </p>
            {result.intervention && <p style={{ marginTop: 0 }}>{result.intervention.message}</p>}
            <p>{result.explanation}</p>
            {result.trap && <p className="muted">{result.trap}</p>}

            {!result.correct && !aiHint && !aiUnavailable && (
              <button className="hint" onClick={getAiHint} disabled={aiLoading}>
                {aiLoading ? 'Thinking…' : 'Why, exactly?'}
              </button>
            )}
            {aiHint && <p className="ai-hint">{aiHint}</p>}

            <button className="primary" onClick={loadNext} disabled={loading}>
              Next question
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
