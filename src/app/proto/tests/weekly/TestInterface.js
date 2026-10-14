'use client';

import { useState } from 'react';
import Link from 'next/link';
import { testQuestion } from '../../_data/mock';

export default function TestInterface() {
  const [selected, setSelected] = useState('B');
  const answered = new Set([1, 2, 3, 4, 5, 6]);
  const marked = new Set([4]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: '100vh' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <strong>Weekly Test · Week 3</strong>
            <div className="muted" style={{ fontSize: '0.85rem' }}>{testQuestion.total} questions · no negative marking</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span className="num" style={{ fontSize: '1.3rem' }}>58:32</span>
            <Link href="/proto/tests/weekly/result" className="btn btn-primary">Submit test</Link>
          </div>
        </div>

        <div style={{ padding: '32px 28px' }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>QUESTION {testQuestion.index} OF {testQuestion.total} · {testQuestion.section.toUpperCase()}</span>
          <h2 style={{ marginTop: 10 }}>{testQuestion.question}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, maxWidth: 560 }}>
            {testQuestion.options.map((o) => (
              <button
                key={o.letter}
                type="button"
                className={`option ${selected === o.letter ? 'option-selected' : ''}`}
                onClick={() => setSelected(o.letter)}
              >
                <span className="option-letter">{o.letter}</span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" className="btn btn-secondary">← Previous</button>
            <button type="button" className="btn btn-ghost">Mark for review</button>
            <button type="button" className="btn btn-ghost">Clear answer</button>
            <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }}>Save &amp; next →</button>
          </div>
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--border)', padding: 24 }}>
        <span className="eyebrow">Question palette</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14 }}>
          {Array.from({ length: testQuestion.total }).map((_, i) => {
            const n = i + 1;
            const isAnswered = answered.has(n);
            const isMarked = marked.has(n);
            const isCurrent = n === testQuestion.index;
            return (
              <div
                key={n}
                style={{
                  aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 600,
                  background: isAnswered ? 'var(--primary)' : 'var(--paper-raised)',
                  color: isAnswered ? '#fff' : 'var(--ink-muted)',
                  border: isCurrent ? '2px solid var(--ink)' : isMarked ? '1px solid var(--secondary)' : '1px solid var(--border)',
                }}
              >
                {n}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, fontSize: '0.85rem' }}>
          <span><span style={{ color: 'var(--primary)' }}>■</span> Answered · {answered.size}</span>
          <span><span style={{ color: 'var(--secondary)' }}>■</span> Marked for review · {marked.size}</span>
          <span><span className="muted">■</span> Not visited · {testQuestion.total - answered.size}</span>
        </div>
        <div className="card-sunk" style={{ marginTop: 20 }}>
          <strong>Sections</strong>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {testQuestion.sections.map((s) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{s.name}</span>
                <span className="muted">{s.range}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16, fontSize: '0.8rem' }}>
          Your answers save as you go. If the connection drops, the paper carries on offline and syncs when it returns.
        </p>
      </div>
    </div>
  );
}
