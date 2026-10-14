'use client';

import { useState } from 'react';
import Link from 'next/link';

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="pill-tab"
          style={value === o ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function RhythmForm() {
  const [duration, setDuration] = useState('30 min');
  const [time, setTime] = useState('Evening · 7 pm');
  const [restDay, setRestDay] = useState('Sunday');
  const [language, setLanguage] = useState('Both, switchable');

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <strong>How long on a normal day?</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={['15 min', '30 min', '45 min', '60 min']} value={duration} onChange={setDuration} />
          </div>
        </div>
        <div>
          <strong>When do you usually study?</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={['Early morning', 'Afternoon', 'Evening · 7 pm', 'Late night']} value={time} onChange={setTime} />
          </div>
        </div>
        <div>
          <strong>Rest day</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={['Saturday', 'Sunday', 'No fixed day']} value={restDay} onChange={setRestDay} />
          </div>
        </div>
        <div>
          <strong>Language</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={['English', 'Tamil', 'Both, switchable']} value={language} onChange={setLanguage} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <Link href="/proto/onboarding/exam" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
        <Link href="/proto/placement" className="btn btn-primary">Continue</Link>
      </div>
    </>
  );
}
