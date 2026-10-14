'use client';

import { useState } from 'react';
import Link from 'next/link';
import { onboardingChoices } from '../../_data/mock';

export default function ExamForm() {
  const [selected, setSelected] = useState(0);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {onboardingChoices.exams.map((e, i) => (
          <button
            key={e.name}
            type="button"
            onClick={() => setSelected(i)}
            className={`option ${selected === i ? 'option-selected' : ''}`}
            style={{ justifyContent: 'space-between' }}
          >
            <span>
              <strong style={{ display: 'block' }}>{e.name}</strong>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{e.note}</span>
            </span>
            {selected === i && <span className="option-letter">✓</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <strong>When is the exam?</strong>
        <div className="card-sunk" style={{ marginTop: 10, padding: 16 }}>Expected · June 2027</div>
        <p style={{ color: 'var(--success)', marginTop: 10, fontSize: '0.9rem' }}>
          About 34 weeks away. That is enough time to rebuild mathematics properly.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <Link href="/proto/onboarding" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
        <Link href="/proto/onboarding/rhythm" className="btn btn-primary">Continue</Link>
      </div>
    </>
  );
}
