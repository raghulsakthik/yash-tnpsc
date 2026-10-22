'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { StatusBadge, ProgressBar } from '../_components/ui';

export default function Learn() {
  const [subjects, setSubjects] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/learn', { cache: 'no-store' }), fetch('/api/curriculum/active', { cache: 'no-store' })])
      .then(async ([subjectRes, curriculumRes]) => {
        const data = await subjectRes.json();
        if (!subjectRes.ok) throw new Error(data.message ?? 'Could not load subjects');
        setSubjects(data.subjects);
        if (curriculumRes.ok) setCurriculum(await curriculumRes.json());
      })
      .catch((err) => setError(err.message));
  }, []);

  async function completeUnit(unitId) {
    setCompleting(true);
    try {
      const res = await fetch('/api/curriculum/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ unitId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not complete the unit');
      const refreshed = await fetch('/api/curriculum/active', { cache: 'no-store' });
      if (refreshed.ok) setCurriculum(await refreshed.json());
    } catch (err) { setError(err.message); } finally { setCompleting(false); }
  }

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

      {curriculum?.current && (
        <div className="card" style={{ marginTop: 24, border: '1px solid var(--primary)' }}>
          <span className="eyebrow">Adaptive curriculum · Today</span>
          <h2 style={{ marginTop: 8 }}>{curriculum.current.phaseName} · Week {curriculum.current.weekNumber} · Day {curriculum.current.dayNumber}</h2>
          <p className="muted" style={{ marginTop: 8 }}>{curriculum.current.dayTitle} — {curriculum.current.dayPurpose}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {curriculum.units.map((unit) => (
              <div key={unit.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>
                <div><strong>{unit.title}</strong><div className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{unit.unitType.replaceAll('_', ' ')}</div></div>
                {unit.progressStatus === 'COMPLETED' ? <span className="muted">Completed ✓</span> : unit.actionUrl && (unit.topicId || unit.unitType === 'TEST') ? <Link href={unit.actionUrl} className="btn btn-primary" style={{ textDecoration: 'none' }}>Start →</Link> : <button type="button" disabled={completing} onClick={() => completeUnit(unit.id)}>{completing ? 'Saving…' : 'Complete'}</button>}
              </div>
            ))}
          </div>
        </div>
      )}

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
