'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/plan/today', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load today\'s plan');
        setPlan(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const ctaHref =
    plan?.primaryAction === 'MEMORY_ECHO'
      ? '/revision'
      : plan?.topicId
        ? `/practice?topic=${plan.topicId}`
        : '/practice';

  const ctaLabel = plan?.primaryAction === 'MEMORY_ECHO' ? 'Review now' : 'Start practising';

  return (
    <main>
      <h1>NOVA</h1>
      <p className="muted">TNPSC prelims practice</p>

      <div className="card" style={{ marginTop: 24 }}>
        {error && (
          <p style={{ marginTop: 0 }}>
            Ten questions. They get harder when you are getting them right and easier when you
            are not.
          </p>
        )}

        {!error && !plan && <p className="muted" style={{ marginTop: 0 }}>Loading today's plan…</p>}

        {!error && plan && (
          <>
            {plan.revisionDue > 0 && (
              <p className="due-badge">
                {plan.revisionDue} topic{plan.revisionDue === 1 ? '' : 's'} due for review
              </p>
            )}
            <p style={{ marginTop: 0 }}>
              {plan.primaryAction === 'NONE'
                ? 'Ten questions. They get harder when you are getting them right and easier when you are not.'
                : plan.reason}
            </p>
            {plan.estimatedMinutes > 0 && (
              <p className="muted">About {plan.estimatedMinutes} minutes.</p>
            )}
          </>
        )}

        <Link
          href={ctaHref}
          className="primary"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '24px' }}
        >
          {ctaLabel}
        </Link>
      </div>

      <div className="secondary-links">
        <Link href="/test">Weekly test</Link>
        <Link href="/mistakes">Review mistakes</Link>
      </div>
    </main>
  );
}
