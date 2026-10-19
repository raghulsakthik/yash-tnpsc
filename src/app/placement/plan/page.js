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

  return (
    <main>
      <StepHeader step={4} total={4} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your plan</p>
        <h1 style={{ fontSize: '2.25rem' }}>Starting with the basics</h1>
        <p className="muted" style={{ marginTop: 14 }}>
          {result
            ? `You answered ${result.correctCount} of ${result.answeredCount} questions correctly. That's real signal now -- it already feeds your mastery and what gets recommended next.`
            : "That's real signal now -- it already feeds your mastery and what gets recommended next."}
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          <span className="eyebrow">Why start here</span>
          <p style={{ marginTop: 12 }}>
            Every topic in Aptitude builds on whole numbers, place value and basic operations. Starting there
            first means nothing later assumes something you have not actually seen -- the same rule the rest
            of the app follows (a topic&apos;s prerequisites have to be solid before it gets recommended).
          </p>
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
