import Link from 'next/link';
import { tests } from '../../_data/mock';

export default function TestInstructions() {
  return (
    <main className="narrow" style={{ margin: '0 auto', padding: '56px 24px' }}>
      <span className="eyebrow">Weekly test · Week {tests.weekly.week}</span>
      <h1 style={{ marginTop: 12 }}>Before you begin</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        {tests.weekly.questions} questions, {tests.weekly.minutes} minutes. No
        negative marking. Read through once — then it starts.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            'The timer starts the moment you begin and cannot be paused.',
            'Navigate freely between questions using the palette on the right.',
            '"Mark for review" flags a question without submitting an answer.',
            'Nothing is revealed until you submit the whole test.',
            'Your answers save as you go — if the connection drops, the paper carries on offline and syncs when it returns.',
          ].map((rule, i) => (
            <div key={rule} style={{ display: 'flex', gap: 14 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunk)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--ink-muted)',
              }}>{i + 1}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-sunk" style={{ marginTop: 16 }}>
        <span className="eyebrow">Sections</span>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {tests.weekly.sections.map((s) => <span key={s} className="badge badge-mastered">{s}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <Link href="/proto/tests" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
        <Link href="/proto/tests/weekly" className="btn btn-primary">Start the test</Link>
      </div>
    </main>
  );
}
