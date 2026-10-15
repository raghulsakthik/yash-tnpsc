'use client';

import { useQuickLab, QUICK_LAB_BANK_BACKED } from '../../../../hooks/useQuickLab';

export default function GameRound({ mode }) {
  const { question, combo, index, roundLength, picked, lastResult, secondsLeft, error, pick } = useQuickLab(mode);

  if (!QUICK_LAB_BANK_BACKED.has(mode)) {
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
