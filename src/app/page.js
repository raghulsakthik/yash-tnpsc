'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from './_components/AppShell';
import { learner } from './_data/mock';

export default function Home() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/plan/today', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? "Could not load today's plan");
        setPlan(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const ctaHref =
    plan?.primaryAction === 'MEMORY_ECHO'
      ? '/revision'
      : plan?.topicId
        ? `/practice/${plan.topicId}`
        : '/practice/aptitude.fractions';

  const ctaLabel = plan?.primaryAction === 'MEMORY_ECHO' ? 'Review now' : 'Continue';

  return (
    <AppShell>
      <span className="muted" style={{ fontSize: '0.85rem', letterSpacing: '0.04em' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      </span>
      <h1 style={{ marginTop: 14 }}>Good morning, {learner.name}.</h1>

      {error && (
        <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}>
          <p>Could not load today&apos;s plan: {error}</p>
        </div>
      )}

      {!error && !plan && <p className="muted" style={{ marginTop: 14 }}>Loading today&apos;s plan…</p>}

      {!error && plan && (
        <div className="card" style={{ marginTop: 20 }}>
          {plan.revisionDue > 0 && plan.primaryAction !== 'MEMORY_ECHO' && (
            <span className="badge badge-revision-due" style={{ marginBottom: 14, display: 'inline-flex' }}>
              {plan.revisionDue} topic{plan.revisionDue === 1 ? '' : 's'} due for review
            </span>
          )}
          <span className="eyebrow" style={{ color: 'var(--warm-accent)', display: 'block' }}>
            {plan.primaryAction === 'MEMORY_ECHO' ? 'Memory echo' : 'Next small win'}
          </span>
          <h2 style={{ marginTop: 10 }}>
            {plan.primaryAction === 'NONE'
              ? 'Ten questions, adapting to you'
              : plan.reason}
          </h2>
          {plan.estimatedMinutes > 0 && (
            <p className="muted" style={{ marginTop: 8 }}>About {plan.estimatedMinutes} minutes.</p>
          )}
          <Link href={ctaHref} className="btn btn-primary" style={{ marginTop: 18 }}>
            {ctaLabel}
          </Link>
        </div>
      )}

      <div className="grid-3" style={{ marginTop: 20 }}>
        <Link href="/tests" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Weekly test</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>25 questions across the full syllabus</span>
        </Link>
        <Link href="/mistakes" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Review mistakes</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>Retry what you've got wrong before</span>
        </Link>
        <Link href="/learn" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Browse subjects</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>See the full syllabus tree</span>
        </Link>
      </div>
    </AppShell>
  );
}
