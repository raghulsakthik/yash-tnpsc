'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { StatusBadge, ProgressBar } from '../_components/ui';

export default function Learn() {
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/learn', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load subjects');
        setSubjects(data.subjects);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">TNPSC Group 2 · CCSE-II</span>
      <h1 style={{ marginTop: 10 }}>Learn</h1>
      <p className="muted" style={{ marginTop: 10 }}>Every subject, with your real progress in each.</p>

      {error && (
        <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}>
          <p>Could not load subjects: {error}</p>
        </div>
      )}
      {!error && !subjects && <p className="muted" style={{ marginTop: 14 }}>Loading…</p>}

      {subjects && (
        <div className="grid-2" style={{ marginTop: 24 }}>
          {subjects.map((s) => (
            <Link
              key={s.slug}
              href={`/learn/${s.slug}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{s.name}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.9rem' }}>
                {s.topics} topics{s.mastered > 0 ? ` · ${s.mastered} mastered` : ''}
                {s.revisionDue > 0 ? ` · ${s.revisionDue} revision due` : ''}
              </p>
              <div style={{ marginTop: 14 }}>
                <ProgressBar value={s.mastery} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.9rem' }}>
                <span>{s.mastery}% mastery</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {s.mastery === 0 ? 'Start →' : 'Open →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
