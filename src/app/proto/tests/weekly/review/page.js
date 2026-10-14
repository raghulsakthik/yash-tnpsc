import Link from 'next/link';
import { testQuestion } from '../../../_data/mock';

export default function TestReview() {
  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href="/proto/tests/weekly/result" style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ flex: 1 }}>Weekly Test · Review</strong>
        <span className="muted">Question {testQuestion.index} of {testQuestion.total}</span>
      </div>

      <div style={{ paddingTop: 30 }}>
        <span className="eyebrow">{testQuestion.section}</span>
        <h1 style={{ marginTop: 10, fontSize: '1.8rem' }}>{testQuestion.question}</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {testQuestion.options.map((o, i) => {
            const correct = o.letter === 'B';
            const chosen = o.letter === 'B';
            let cls = 'option';
            if (correct) cls += ' option-correct';
            return (
              <div key={o.letter} className={cls} style={{ cursor: 'default' }}>
                <span className="option-letter">{o.letter}</span>
                <span>{o.text}</span>
                {correct && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>{chosen ? 'Your answer · correct' : 'Answer'}</span>}
              </div>
            );
          })}
        </div>

        <div className="card-sunk" style={{ marginTop: 20, background: 'var(--success-tint)' }}>
          <span className="eyebrow" style={{ color: 'var(--success)' }}>Correct</span>
          <p style={{ marginTop: 8 }}>
            Doubling takes 8 years, so the sum grows by one full principal every 8
            years at this rate. Tripling needs two more principals&apos; worth of
            interest, which takes 16 years — 8 + 16 = 24 is the trap; the real
            answer uses the rate directly: 16 years.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button type="button" className="btn btn-secondary">← Previous</button>
          <Link href="/proto/tests/weekly/result" className="btn btn-primary">Back to result</Link>
        </div>
      </div>
    </main>
  );
}
