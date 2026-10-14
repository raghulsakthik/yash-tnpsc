import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { tests } from '../_data/mock';

export default function Tests() {
  return (
    <AppShell>
      <span className="eyebrow">Tests</span>
      <h1 style={{ marginTop: 10 }}>Find out where you stand</h1>
      <p className="muted" style={{ marginTop: 10 }}>A test is a measurement, not a verdict. Everything you get wrong turns into revision rather than a number you carry around.</p>

      <div className="card-tint" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="badge" style={{ background: 'var(--primary)', color: '#fff' }}>UNLOCKED · WEEK {tests.weekly.week}</span>
          <h2 style={{ marginTop: 12 }}>Your weekly test is ready</h2>
          <p className="muted" style={{ marginTop: 8, maxWidth: 560 }}>
            {tests.weekly.questions} questions, {tests.weekly.minutes} minutes, drawn from everything you have touched in the last three weeks — weighted towards the topics you have just learned.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {tests.weekly.sections.map((s) => (
              <span key={s} className="badge" style={{ background: '#fff' }}>{s}</span>
            ))}
          </div>
        </div>
        <Link href="/proto/tests/instructions" className="btn btn-primary">Begin test</Link>
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Or choose your own</span>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {tests.options.map((o) => (
          <div key={o.name} className="card">
            <h3 style={{ fontSize: '1.1rem' }}>{o.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{o.desc}</p>
            <hr className="rule" style={{ margin: '14px 0 10px' }} />
            <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>{o.meta}</span>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">Previous tests</span>
          <div style={{ marginTop: 12 }}>
            {tests.previous.map((t, i) => (
              <div key={t.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0',
                borderTop: i ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{t.date}</div>
                </div>
                <Link href="/proto/tests/weekly/result" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-mastered">{t.score}</span>
                  <span className="muted">›</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">Your trend</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 100, marginTop: 16 }}>
              {tests.trend.map((v, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: `${v}%`, borderRadius: 6,
                    background: i === tests.trend.length - 1 ? 'var(--primary)' : 'var(--secondary-tint)',
                  }} />
                  <div className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>{v}%</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 12, fontSize: '0.85rem' }}>Up 22 points across three weeks, mostly from mathematics.</p>
          </div>
          <div className="card" style={{ background: 'var(--warm-tint)', border: '1px solid #e7c6ac' }}>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Before the full mock</span>
            <p style={{ marginTop: 8 }}>
              A 100-question paper is a different kind of tired. Worth attempting
              one once Profit &amp; Loss is above 60% — otherwise the result mostly
              measures that one gap.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
