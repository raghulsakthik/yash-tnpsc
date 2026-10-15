'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const BANK_BACKED = new Set(['percentage-rush', 'fraction-lab']);
const ROUND_SECONDS = 120;

export default function GameRound({ mode }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [combo, setCombo] = useState(0);
  const [index, setIndex] = useState(1);
  const [roundLength, setRoundLength] = useState(10);
  const [picked, setPicked] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [error, setError] = useState(null);

  const shownAt = useRef(Date.now());
  const finishing = useRef(false);

  const finishOnTimeout = useCallback(async () => {
    if (finishing.current || !sessionId) return;
    finishing.current = true;
    try {
      await fetch(`/api/quick-lab/session/${sessionId}/complete`, { method: 'POST' });
    } catch {
      // the result page re-reads the session either way
    }
    router.push(`/proto/quick-lab/${mode}/result?session=${sessionId}`);
  }, [sessionId, mode, router]);

  useEffect(() => {
    if (!BANK_BACKED.has(mode)) return;
    let cancelled = false;
    fetch('/api/quick-lab/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.message ?? 'Could not start a round');
        setSessionId(data.sessionId);
        setQuestion(data.question);
        setRoundLength(data.roundLength);
        shownAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!sessionId || lastResult?.done) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          finishOnTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId, lastResult, finishOnTimeout]);

  async function pick(optionIndex) {
    if (picked !== null || !question) return;
    setPicked(optionIndex);
    try {
      const res = await fetch('/api/quick-lab/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.questionId,
          selectedIndex: optionIndex,
          timeTakenMs: Date.now() - shownAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not record that answer');
      setLastResult(data);
      setCombo(data.combo);
      setIndex((n) => n + 1);

      setTimeout(() => {
        if (data.done) {
          router.push(`/proto/quick-lab/${mode}/result?session=${sessionId}`);
        } else {
          setQuestion(data.nextQuestion);
          setPicked(null);
          setLastResult(null);
          shownAt.current = Date.now();
        }
      }, 500);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!BANK_BACKED.has(mode)) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ color: '#fff' }}>This mode isn&apos;t wired up yet</h1>
        <p className="muted">
          {mode.replace(/-/g, ' ')} needs its own question-generation engine — only Percentage Rush and Fraction Lab run on real data today.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ color: '#fff' }}>Something broke</h1>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="muted">Preparing your round…</p>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', borderBottom: '1px solid #3a342a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <strong style={{ textTransform: 'capitalize' }}>{mode.replace(/-/g, ' ')}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--warm-accent)', fontWeight: 700 }}>
            ×{combo} <span className="muted" style={{ fontWeight: 400 }}>combo</span>
          </div>
          <div className="num" style={{ fontSize: '1.1rem' }}>
            {minutes}:{seconds} <span className="muted" style={{ fontSize: '0.75rem' }}>remaining</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 90 }}>
        <span className="muted" style={{ fontSize: '0.8rem', letterSpacing: '0.08em' }}>
          QUESTION {Math.min(index, roundLength)} OF {roundLength}
        </span>
        <div style={{ fontSize: '1.6rem', margin: '16px auto', maxWidth: 700, color: '#fff' }}>{question.prompt}</div>

        <div className="grid-2" style={{ maxWidth: 560, margin: '40px auto 0' }}>
          {question.options.map((o, i) => {
            let background = '#2a241c';
            let border = '1px solid #3a342a';
            if (lastResult) {
              if (i === lastResult.correctIndex) {
                background = '#2f4a38';
                border = '1px solid var(--success)';
              } else if (i === picked) {
                background = '#4a2f24';
                border = '1px solid var(--warm-accent)';
              }
            } else if (picked === i) {
              background = '#3a342a';
              border = '1px solid var(--warm-accent)';
            }
            return (
              <button
                key={o}
                type="button"
                onClick={() => pick(i)}
                disabled={picked !== null}
                className="num"
                style={{ padding: '24px', borderRadius: 14, fontSize: '1.8rem', background, border, color: '#fff', cursor: picked === null ? 'pointer' : 'default' }}
              >
                {o}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 24, fontSize: '0.85rem' }}>Tap an answer — the next question comes immediately.</p>
      </div>
    </div>
  );
}
