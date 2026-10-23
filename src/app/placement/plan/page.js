'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StepHeader from '../../_components/StepHeader';

export default function PlacementPlan() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('onboarding-result');
      if (saved) setResult(JSON.parse(saved));
    } catch {
      // no saved result -- the fallback copy below covers it
    }
  }, []);

  const firstTopicId = result?.firstTopicId ?? 'aptitude.whole-numbers';
  const placement = result?.placement;
  const levelName = placement?.levelName ?? 'Foundation';

  return (
    <main>
      <StepHeader step={4} total={4} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your plan</p>
        <h1 style={{ fontSize: '2.25rem' }}>Your starting level: {levelName}</h1>
        <p className="muted" style={{ marginTop: 14 }}>
          {result
            ? `You answered ${result.correctCount} of ${result.answeredCount} questions correctly (${result.score ?? 0}%). YASH placed you using that evidence instead of sending everyone through the same starting point.`
            : "Your diagnostic determines the starting point; YASH then adapts from your actual performance."}
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          <span className="eyebrow">Placement decision</span>
          <p style={{ marginTop: 12 }}>
            {placement?.reason ?? 'Your diagnostic evidence determines the first phase and week available in the curriculum.'}
          </p>
          {placement?.phaseName ? <p className="muted" style={{ marginTop: 8 }}>Path: {placement.phaseName} · Week {placement.weekNumber} · Day {placement.dayNumber}</p> : null}
        </div>

        <div className="card-dark" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>From here</span>
          <p style={{ marginTop: 12, color: '#fff' }}>
            Home adapts after every question you answer -- what you see tomorrow depends on what you actually
            do today, not a fixed schedule.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
          <Link href={`/practice/${firstTopicId}`} className="btn btn-primary">Start my first session</Link>
        </div>
      </div>
    </main>
  );
}
