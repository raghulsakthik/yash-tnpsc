import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressRing } from '../_components/ui';
import { learner, revisionDue, quickLabModes } from '../_data/mock';

export default function Home() {
  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <span className="muted" style={{ fontSize: '0.85rem', letterSpacing: '0.04em' }}>WEDNESDAY, 14 OCTOBER</span>
        <span className="badge" style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>
          ● IMPROVING &nbsp;accuracy up, speed steady
        </span>
      </div>
      <h1 style={{ marginTop: 14 }}>Good morning, {learner.name}.</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
        Today&apos;s focus is strengthening Fractions — about 18 minutes. Decimal
        conversion is the one piece still slowing you down.
      </p>

      <div className="card" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Next small win</span>
          <h2 style={{ marginTop: 8 }}>Master decimal conversion</h2>
          <p className="muted" style={{ marginTop: 10, maxWidth: 460 }}>
            Three worked examples, then six questions. This is the last gap between
            you and Fractions being done.
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 18 }}>
            <Link href="/proto/lesson/fractions" className="btn btn-primary">Continue</Link>
            <span className="muted">12 minutes</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <ProgressRing value={80} label="of 30 min" />
          <p className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>24 of 30 min · Today&apos;s goal</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card-tint">
          <span className="eyebrow" style={{ color: 'var(--secondary)' }}>✦ Memory echo</span>
          <h3 style={{ marginTop: 10 }}>HCF and LCM</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            This one gave you trouble three weeks ago. You haven&apos;t seen it since
            — a good moment to find out if it stuck.
          </p>
          <Link href="/proto/revision" style={{ display: 'inline-block', marginTop: 14, color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>
            Try one question →
          </Link>
        </div>
        <div className="card">
          <span className="eyebrow">Revision due</span>
          <div style={{ marginTop: 10 }}>
            {revisionDue.map((r, i) => (
              <div key={r.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>{r.name}</strong>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{r.badge}</span>
                </div>
                <Link href="/proto/revision" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>Review</Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">Quick Lab · 2 minutes</span>
          <Link href="/proto/quick-lab" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>All games →</Link>
        </div>
        <div className="grid-3" style={{ marginTop: 14 }}>
          {quickLabModes.slice(0, 3).map((m) => (
            <Link key={m.slug} href={`/proto/quick-lab/${m.slug}`} className="card-sunk" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong style={{ display: 'block' }}>{m.name}</strong>
              <span className="muted" style={{ fontSize: '0.8rem' }}>{m.stat}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">This week</span>
          <Link href="/proto/weekly-review" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>Full weekly review →</Link>
        </div>
        <div className="stat-row" style={{ marginTop: 16 }}>
          <div className="stat"><div className="num">186</div><div className="label">minutes</div></div>
          <div className="stat"><div className="num">214</div><div className="label">questions</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>81%</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>+9%</div><div className="label">mastery</div></div>
          <div className="stat"><div className="num">74%</div><div className="label">retention</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>12</div><div className="label">day streak</div></div>
        </div>
      </div>
    </AppShell>
  );
}
