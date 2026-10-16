import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { StatusBadge, ProgressBar } from '../_components/ui';
import { subjects } from '../_data/mock';

export default function Learn() {
  return (
    <AppShell>
      <span className="eyebrow">TNPSC Group 2 · CCSE-II</span>
      <h1 style={{ marginTop: 10 }}>Learn</h1>
      <p className="muted" style={{ marginTop: 10 }}>Ten subjects, one path at a time. Mathematics is where you are building right now.</p>

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
              {s.note || `${s.topics} topics${s.mastered !== undefined ? ` · ${s.mastered} mastered` : ''}${s.revisionDue ? ` · ${s.revisionDue} revision due` : ''}`}
            </p>
            <div style={{ marginTop: 14 }}>
              <ProgressBar value={s.mastery} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.9rem' }}>
              <span>{s.mastery}% mastery</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {s.continueLabel || (s.mastery === 0 ? 'Start →' : 'Open →')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
