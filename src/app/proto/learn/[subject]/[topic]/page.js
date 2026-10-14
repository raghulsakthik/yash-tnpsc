import Link from 'next/link';
import AppShell from '../../../_components/AppShell';
import { ProgressBar } from '../../../_components/ui';
import { fractionsTopic } from '../../../_data/mock';

export default async function Topic({ params }) {
  const { subject, topic } = await params;
  const t = fractionsTopic; // single mock topic reused regardless of slug for this prototype

  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/proto/learn" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Learn</Link> /{' '}
        <Link href={`/proto/learn/${subject}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
          {subject === 'mathematics' ? 'Mathematics' : subject}
        </Link> / {t.name}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1>{t.name}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <span className="badge badge-near-mastery">{t.status}</span>
            <span className="muted">{t.lesson}</span>
          </div>
        </div>
        <Link href={`/proto/lesson/${topic}`} className="btn btn-primary">Continue lesson →</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 24, alignItems: 'start' }}>
        <div>
          <span className="eyebrow">Ways into this topic</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {[
              { icon: '✦', title: 'Learn', note: '8 steps · 3 done · about 14 minutes left', action: 'Continue', href: `/proto/lesson/${topic}` },
              { icon: '✦', title: 'Practice', note: 'Adaptive questions · 81% accuracy so far', action: 'Open', href: `/proto/practice/${topic}` },
              { icon: '◆', title: 'Speed · Fraction Lab', note: 'Where your scores say the gap is', action: 'Play', href: '/proto/quick-lab/fraction-lab' },
              { icon: '✦', title: 'Revision', note: 'Next check-in in 3 days', action: 'Schedule', href: '/proto/revision' },
              { icon: '✦', title: 'TNPSC questions', note: '34 previous-year questions touch fractions', action: 'Practise', href: `/proto/pyqs/${topic}` },
            ].map((row) => (
              <Link key={row.title} href={row.href} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit', padding: 18,
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, background: 'var(--secondary-tint)', color: 'var(--secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{row.icon}</span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block' }}>{row.title}</strong>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{row.note}</span>
                </span>
                <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>{row.action}</span>
              </Link>
            ))}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <span className="eyebrow">How this comes back</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              {t.reviewStops.map((s) => (
                <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', margin: '0 auto 6px',
                    background: s.done ? 'var(--success)' : s.current ? 'transparent' : 'var(--border)',
                    border: s.current ? '2px solid var(--primary)' : 'none',
                  }} />
                  <div style={{ fontWeight: s.current ? 700 : 400, fontSize: '0.85rem', color: s.current ? 'var(--primary)' : 'inherit' }}>{s.label}</div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>{s.date || (s.done ? 'done' : s.note || '')}</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 16, fontSize: '0.88rem' }}>
              Each successful review pushes the next one further out. A miss pulls it closer again — that is the whole mechanism.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">What {t.mastery}% is made of</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {t.dimensions.map((d) => (
                <div key={d.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 6 }}>
                    <span>{d.label}</span>
                    <strong style={{ color: d.weak ? 'var(--warm-accent)' : 'inherit' }}>{d.value}%</strong>
                  </div>
                  <ProgressBar value={d.value} color={d.weak ? 'var(--warm-accent)' : 'var(--success)'} />
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>
              Speed is the only part holding this below mastery. Ten timed questions would likely close it.
            </p>
          </div>
          <div className="card">
            <span className="eyebrow">Rests on</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {t.restsOn.map((r) => (
                <div key={r.name} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: r.done ? 'var(--success)' : 'var(--secondary)' }}>{r.done ? '✓' : '↻'}</span>
                  <span>{r.name}{r.note && <span className="muted"> · {r.note}</span>}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
