import Link from 'next/link';
import OptionList from '../../_components/OptionList';
import { practiceQuestion } from '../../_data/mock';

export default async function Practice({ params }) {
  const { topic } = await params;
  const q = practiceQuestion;

  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/proto/learn/mathematics/${topic}`} style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ textTransform: 'capitalize', flex: 1 }}>{topic} · practice</strong>
        <span className="badge badge-mastered">{q.difficulty}</span>
        <span className="muted">{q.time}</span>
      </div>

      <div style={{ paddingTop: 36 }}>
        <span className="eyebrow">Question {q.index} of {q.total}</span>
        <h1 style={{ marginTop: 10, fontSize: '2rem' }}>{q.question}</h1>
        <div style={{ marginTop: 24 }}>
          <OptionList options={q.options} correctLetter={q.correct} />
        </div>

        <div className="card" style={{ marginTop: 28 }}>
          <h3>Let&apos;s break it down.</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {q.steps.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', gap: 14, paddingBottom: 14, borderBottom: i < q.steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
          <div className="card-sunk" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Answer</span>
            <span className="num" style={{ fontSize: '1.4rem' }}>{q.answer}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn btn-primary">Try a similar one</button>
            <Link href={`/proto/learn/mathematics/${topic}`} className="btn btn-secondary">Continue</Link>
          </div>
        </div>

        <div className="card-dark" style={{ marginTop: 20 }}>
          <h3 style={{ color: '#fff' }}>That&apos;s completely fine. How would you like to carry on?</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {['Explain it more simply', 'Just give me a hint', 'Teach me the prerequisite', 'Show another example', 'Slow this down', 'Try an easier question'].map((opt) => (
              <button key={opt} type="button" className="btn btn-dark btn-sm">{opt}</button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 16, fontSize: '0.8rem' }}>Nothing here costs you progress, and none of it is recorded as a failure.</p>
        </div>
      </div>
    </main>
  );
}
