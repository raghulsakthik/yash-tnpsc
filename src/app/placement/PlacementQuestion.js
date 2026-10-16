'use client';

import { useState } from 'react';
import Link from 'next/link';
import { placementCheck } from '../_data/mock';

export default function PlacementQuestion() {
  const [selected, setSelected] = useState('A');

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow">Starting check · {placementCheck.index} of {placementCheck.total}</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>No timer</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 20 }}>
        {Array.from({ length: placementCheck.total }).map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < placementCheck.index ? 'var(--success)' : i === placementCheck.index ? 'var(--primary)' : 'var(--border)',
          }} />
        ))}
      </div>
      <h3>{placementCheck.question}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {placementCheck.options.map((o) => (
          <button
            key={o.letter}
            type="button"
            className={`option ${selected === o.letter ? 'option-selected' : ''}`}
            onClick={() => setSelected(o.letter)}
          >
            <span className="option-letter">{o.letter}</span>
            <span>{o.text}</span>
            {o.note && <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{o.note}</span>}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        This is not a test. It only finds where to start, so a lesson never assumes something you have not seen.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Link href="/onboarding/rhythm" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
        <Link href="/placement/plan" className="btn btn-primary">Next question</Link>
      </div>
    </div>
  );
}
