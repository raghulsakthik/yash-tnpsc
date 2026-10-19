'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className="pill-tab"
          style={value === o.value ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Tamil', value: 'ta' },
];

/**
 * Both fields here map to a real learner_profile column (daily_goal_minutes,
 * language) -- carried forward via sessionStorage to the placement quiz,
 * then sent together to POST /api/onboarding/complete at the very end.
 */
export default function RhythmForm() {
  const router = useRouter();
  const [duration, setDuration] = useState(30);
  const [language, setLanguage] = useState('en');

  function next() {
    try {
      sessionStorage.setItem('onboarding-draft', JSON.stringify({ dailyGoalMinutes: duration, language }));
    } catch {
      // sessionStorage unavailable (private mode) -- /api/onboarding/complete just falls back to defaults.
    }
    router.push('/placement');
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <strong>How long on a normal day?</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={DURATIONS} value={duration} onChange={setDuration} />
          </div>
        </div>
        <div>
          <strong>Language</strong>
          <div style={{ marginTop: 10 }}>
            <PillGroup options={LANGUAGES} value={language} onChange={setLanguage} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <a href="/onboarding" className="muted" style={{ textDecoration: 'none' }}>← Back</a>
        <button type="button" className="btn btn-primary" onClick={next}>Continue</button>
      </div>
    </>
  );
}
