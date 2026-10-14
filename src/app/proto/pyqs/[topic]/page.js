import Link from 'next/link';
import { pyqQuestion } from '../../_data/mock';

export default async function PyqQuestion({ params }) {
  const { topic } = await params;
  const q = pyqQuestion;

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href="/proto/pyqs" style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ textTransform: 'capitalize', flex: 1 }}>PYQ · {topic}</strong>
        <span className="muted">Question {q.index} of {q.total}</span>
      </div>

      <div style={{ paddingTop: 30 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-learning">{q.exam}</span>
          <span className="badge" style={{ background: 'var(--paper-sunk)', color: 'var(--ink-muted)' }}>{q.ref}</span>
          <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>{q.difficulty}</span>
          <span className="badge badge-revision-due">{q.repeat}</span>
        </div>
        <h1 style={{ marginTop: 18, fontSize: '1.8rem' }}>{q.question}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {q.options.map((o) => {
            let cls = 'option';
            if (o.correct) cls += ' option-correct';
            else if (o.chosen) cls += ' option-incorrect';
            return (
              <div key={o.letter} className={cls} style={{ cursor: 'default' }}>
                <span className="option-letter">{o.letter}</span>
                <span>{o.text}</span>
                {o.correct && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>Answer</span>}
                {o.chosen && !o.correct && <span style={{ marginLeft: 'auto', color: 'var(--warm-accent)', fontWeight: 600, fontSize: '0.85rem' }}>You chose this</span>}
              </div>
            );
          })}
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h3>Where it turned</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {q.steps.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', gap: 14 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunk)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--ink-muted)',
                }}>{i + 1}</span>
                <div>
                  <div>{s.label}</div>
                  <div className="num" style={{ color: 'var(--primary)', marginTop: 4 }}>{s.math}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card-sunk" style={{ marginTop: 16 }}>
            <span className="eyebrow">Your mistake, classified</span>
            <p style={{ marginTop: 8 }}>
              Subtracted the numerators without matching denominators — the same
              slip as two of your previous fraction mistakes. Filed under{' '}
              <strong>conceptual</strong>, not calculation, so the fix is a reteach
              rather than more drilling.
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card-tint">
            <span className="eyebrow" style={{ color: 'var(--secondary)' }}>Topic</span>
            <strong style={{ display: 'block', marginTop: 6 }}>Fractions · unlike denominators</strong>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Mastery nudged down to 70%</span>
          </div>
          <div className="card">
            <span className="eyebrow">Rests on</span>
            <strong style={{ display: 'block', marginTop: 6 }}>LCM of two numbers</strong>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Already queued for revision</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link href="/proto/pyqs/analysis" className="btn btn-secondary">Ask tutor</Link>
          <Link href="/proto/pyqs/analysis" className="btn btn-primary">Next question</Link>
        </div>
      </div>
    </main>
  );
}
