import Link from 'next/link';
import AppShell from '../../_components/AppShell';
import { ProgressRing } from '../../_components/ui';
import { subjects, mathematicsPath, stillAhead } from '../../_data/mock';

const STATE_STYLE = {
  mastered: { bg: 'var(--success-tint)', border: 'var(--success)' },
  'in-progress': { bg: 'var(--secondary-tint)', border: 'var(--primary)' },
  'revision-due': { bg: 'var(--secondary-tint)', border: 'var(--secondary)' },
  locked: { bg: 'var(--paper-sunk)', border: 'var(--border)', dim: true },
};

export default async function Subject({ params }) {
  const { subject: subjectSlug } = await params;
  const subject = subjects.find((s) => s.slug === subjectSlug) || subjects[0];
  const isMath = subject.slug === 'mathematics';

  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/learn" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Learn</Link> / {subject.name}
      </div>

      <div className="card" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem' }}>{subject.name}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            {isMath
              ? 'Nineteen topics, ordered so each one only asks for what you already have. You are eight steps in.'
              : `${subject.topics ?? 'Several'} topics, ordered the same way mathematics is.`}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="badge badge-mastered">{subject.mastered ?? 0} mastered</span>
            <span className="badge badge-learning">1 in progress</span>
            {subject.revisionDue && <span className="badge badge-revision-due">{subject.revisionDue} revision due</span>}
          </div>
        </div>
        <ProgressRing value={subject.mastery} label="mastery" />
      </div>

      {isMath ? (
        <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
          <div>
            <span className="eyebrow">The path · each step unlocks the next</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {mathematicsPath.map((t) => {
                const style = STATE_STYLE[t.state] || STATE_STYLE.locked;
                const content = (
                  <>
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: t.state === 'locked' ? 'var(--border)' : style.border,
                      color: t.state === 'locked' ? 'var(--ink-muted)' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem',
                    }}>
                      {t.state === 'mastered' ? '✓' : t.state === 'revision-due' ? '↻' : t.n}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: style.dim ? 'var(--ink-muted)' : 'var(--ink)' }}>{t.name}</strong>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>{t.note}</div>
                    </div>
                    {t.state === 'in-progress' && <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>Continue →</span>}
                    {t.state === 'revision-due' && <span style={{ color: 'var(--secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Review</span>}
                  </>
                );
                const card = (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
                    border: `1px solid ${style.border}`, borderRadius: 14, background: style.bg,
                  }}>{content}</div>
                );
                return t.state === 'locked' ? (
                  <div key={t.n}>{card}</div>
                ) : (
                  <Link key={t.n} href={`/learn/mathematics/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>{card}</Link>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <span className="eyebrow">Still ahead</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {stillAhead.map((t) => <span key={t} className="muted">{t}</span>)}
              </div>
              <hr className="rule" style={{ margin: '14px 0' }} />
              <p className="muted" style={{ fontSize: '0.85rem' }}>At your current pace, Percentages opens in about four days.</p>
            </div>
            <div className="card-tint">
              <span className="eyebrow" style={{ color: 'var(--secondary)' }}>✦ Why this order</span>
              <p style={{ marginTop: 10 }}>
                Percentages is three-quarters fraction work in disguise. Finishing
                Fractions first is what stops percentage questions from feeling
                impossible later.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">
            This subject follows the same path structure as Mathematics — topics
            unlock in order, each resting on the one before it. Full topic list
            omitted from this mock for brevity.
          </p>
        </div>
      )}
    </AppShell>
  );
}
