import AppShell from '../_components/AppShell';
import { weeklyReview } from '../_data/mock';

export default function WeeklyReview() {
  const w = weeklyReview;
  return (
    <AppShell>
      <span className="badge badge-learning">WEEK {w.week} · {w.dateRange}</span>
      <h1 style={{ marginTop: 14 }}>A good week, and a clear next one</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Six days of work, your best test yet, and fractions nearly closed. One
        thing slipped, and it is the obvious thing to fix first.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{w.minutes}</div><div className="label">minutes studied</div></div>
          <div className="stat"><div className="num">{w.questions}</div><div className="label">questions</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{w.accuracy}</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="num">{w.mastered}</div><div className="label">topics mastered</div></div>
          <div className="stat"><div className="num">{w.pyqs}</div><div className="label">PYQs done</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{w.days}</div><div className="label">days</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow" style={{ color: 'var(--success)' }}>What improved</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {w.improved.map((i) => (
              <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span style={{ color: 'var(--success)' }}>↑</span> {i.name}</span>
                <strong>{i.from} → {i.to}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>What slipped</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {w.slipped.map((s) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><span style={{ color: 'var(--warm-accent)' }}>↓</span> {s.name}</span>
                <span className="muted">{s.note}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>Nothing here is failure — HCF simply aged out, and science was not on the plan.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">Consistency</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 14, maxWidth: 360 }}>
          {[3, 3, 2, 4, 2, 3, 0, 2, 2, 1, 1, 3, 2, 2, 1, 3, 2, 3, 3, 0, 2].map((v, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 6,
              background: v === 0 ? 'var(--paper-sunk)' : `rgba(21,112,79,${0.25 + v * 0.2})`,
            }} />
          ))}
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Strongest sessions are Tuesday and Thursday evenings. The daily plan now
          puts the hardest new concept there.
        </p>
      </div>

      <div className="card-dark" style={{ marginTop: 16 }}>
        <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Next week&apos;s focus · built from the above</span>
        <h3 style={{ color: '#fff', marginTop: 10 }}>{w.nextFocus.title}</h3>
        <div className="grid-3" style={{ marginTop: 16 }}>
          {w.nextFocus.plan.map((p) => (
            <div key={p.range} style={{ background: '#2a241c', borderRadius: 12, padding: 16 }}>
              <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>{p.range}</span>
              <p style={{ marginTop: 8, fontSize: '0.9rem' }}>{p.note}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button type="button" className="btn btn-light">Accept this plan</button>
          <button type="button" className="btn btn-dark">Adjust it</button>
        </div>
      </div>
    </AppShell>
  );
}
