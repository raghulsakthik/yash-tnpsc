'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const ROUND_LENGTH = 10;
const MEMORIZE_MS = 1800;

export default function GameRound({ mode }) {
  const router = useRouter();
  const [question, setQuestion] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | memorize | answer | feedback
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct, correctIndex }
  const [index, setIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [results, setResults] = useState([]);
  const startedAtRef = useRef(null);

  async function loadNext() {
    setPicked(null);
    setFeedback(null);
    setPhase('loading');
    try {
      const res = await fetch(`/api/quick-lab/${mode}/next`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not load the next question');
      setQuestion(data);
      startedAtRef.current = Date.now();
      setPhase(data.memorize ? 'memorize' : 'answer');
    } catch {
      setQuestion(null);
      setPhase('error');
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (phase !== 'memorize') return;
    const t = setTimeout(() => setPhase('answer'), MEMORIZE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  async function pick(optionIndex) {
    if (phase !== 'answer' || !question) return;
    setPicked(optionIndex);
    const timeTakenMs = Date.now() - startedAtRef.current;

    try {
      const res = await fetch('/api/quick-lab/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: question.token, selectedIndex: optionIndex, mode, timeTakenMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not submit');

      setFeedback(data);
      setPhase('feedback');
      setResults((prev) => [...prev, { prompt: question.prompt, correct: data.correct, timeTakenMs }]);
      setCombo((c) => {
        const next = data.correct ? c + 1 : 0;
        setBestCombo((best) => Math.max(best, next));
        return next;
      });

      setTimeout(() => {
        if (index + 1 >= ROUND_LENGTH) {
          const final = [...results, { prompt: question.prompt, correct: data.correct, timeTakenMs }];
          sessionStorage.setItem(
            `quicklab:${mode}`,
            JSON.stringify({ mode, results: final, bestCombo: Math.max(bestCombo, combo + (data.correct ? 1 : 0) - combo) })
          );
          router.push(`/quick-lab/${mode}/result`);
        } else {
          setIndex((i) => i + 1);
          loadNext();
        }
      }, 650);
    } catch {
      setFeedback({ correct: false, correctIndex: -1, error: true });
      setPhase('feedback');
    }
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="muted">Could not load this round. <a href={`/quick-lab/${mode}`} style={{ color: 'var(--warm-accent)' }}>Try again</a></p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', borderBottom: '1px solid #3a342a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/quick-lab" style={{ color: '#a39d91', textDecoration: 'none', fontSize: '1.2rem' }}>×</a>
          <strong style={{ textTransform: 'capitalize' }}>{mode.replace(/-/g, ' ')}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--warm-accent)', fontWeight: 700 }}>×{combo} <span className="muted" style={{ fontWeight: 400 }}>combo</span></div>
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 90 }}>
        <span className="muted" style={{ fontSize: '0.8rem', letterSpacing: '0.08em' }}>
          QUESTION {Math.min(index + 1, ROUND_LENGTH)} OF {ROUND_LENGTH}
        </span>

        {phase === 'loading' && <p className="muted" style={{ marginTop: 30 }}>Loading…</p>}

        {question && (phase === 'memorize' || phase === 'answer' || phase === 'feedback') && (
          <>
            <div className="num" style={{ fontSize: phase === 'memorize' ? '2.4rem' : '3rem', margin: '16px 0', color: '#fff' }}>
              {phase === 'memorize' ? question.prompt : question.revealPrompt || question.prompt}
            </div>
            {phase !== 'memorize' && <p className="muted">{question.hint}</p>}

            {phase !== 'memorize' && (
              <div className="grid-2" style={{ maxWidth: 560, margin: '40px auto 0' }}>
                {question.options.map((o, i) => {
                  const isPicked = picked === i;
                  const isCorrectReveal = phase === 'feedback' && feedback && i === feedback.correctIndex;
                  const isWrongPick = phase === 'feedback' && isPicked && !feedback?.correct;
                  return (
                    <button
                      key={o + i}
                      type="button"
                      onClick={() => pick(i)}
                      disabled={phase === 'feedback'}
                      className="num"
                      style={{
                        padding: '24px',
                        borderRadius: 14,
                        fontSize: '1.8rem',
                        background: isCorrectReveal ? '#1f4d3a' : isWrongPick ? '#4d1f1f' : isPicked ? '#3a342a' : '#2a241c',
                        border: isCorrectReveal
                          ? '1px solid var(--success)'
                          : isWrongPick
                            ? '1px solid #c0392b'
                            : isPicked
                              ? '1px solid var(--warm-accent)'
                              : '1px solid #3a342a',
                        color: '#fff',
                        cursor: phase === 'feedback' ? 'default' : 'pointer',
                      }}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="muted" style={{ marginTop: 24, fontSize: '0.85rem' }}>
          {phase === 'memorize' ? 'Memorize this, then answer.' : 'Tap an answer — the next question comes immediately.'}
        </p>
      </div>
    </div>
  );
}
