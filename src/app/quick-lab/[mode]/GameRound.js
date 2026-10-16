'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { quickLabRound } from '../../_data/mock';

export default function GameRound({ mode }) {
  const router = useRouter();
  const [picked, setPicked] = useState(null);

  function pick(opt) {
    setPicked(opt);
    setTimeout(() => router.push(`/quick-lab/${mode}/result`), 300);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b16', color: '#f6f3ec' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', borderBottom: '1px solid #3a342a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#a39d91', cursor: 'pointer' }}>×</span>
          <strong style={{ textTransform: 'capitalize' }}>{mode.replace('-', ' ')}</strong>
          <span className="badge" style={{ background: '#3a342a', color: '#d8c9a8' }}>Level {quickLabRound.level}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--warm-accent)', fontWeight: 700 }}>×{quickLabRound.combo} <span className="muted" style={{ fontWeight: 400 }}>combo</span></div>
          <div className="num" style={{ fontSize: '1.1rem' }}>{quickLabRound.timeLeft} <span className="muted" style={{ fontSize: '0.75rem' }}>remaining</span></div>
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 90 }}>
        <span className="muted" style={{ fontSize: '0.8rem', letterSpacing: '0.08em' }}>QUESTION 6 OF 10</span>
        <div className="num" style={{ fontSize: '3rem', margin: '16px 0', color: '#fff' }}>{quickLabRound.question}</div>
        <p className="muted">{quickLabRound.hint}</p>

        <div className="grid-2" style={{ maxWidth: 560, margin: '40px auto 0' }}>
          {quickLabRound.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => pick(o)}
              className="num"
              style={{
                padding: '24px', borderRadius: 14, fontSize: '1.8rem',
                background: picked === o ? '#3a342a' : '#2a241c',
                border: picked === o ? '1px solid var(--warm-accent)' : '1px solid #3a342a',
                color: '#fff', cursor: 'pointer',
              }}
            >
              {o}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 24, fontSize: '0.85rem' }}>Tap an answer — the next question comes immediately.</p>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 26px',
        borderTop: '1px solid #3a342a', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
      }}>
        <span style={{ color: 'var(--success)' }}>✓ {quickLabRound.prev.label}</span>
        <span className="muted">{quickLabRound.prev.time}</span>
      </div>
    </div>
  );
}
