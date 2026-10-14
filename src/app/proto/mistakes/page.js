import AppShell from '../_components/AppShell';
import { mistakes } from '../_data/mock';

export default function Mistakes() {
  const [featured, ...rest] = mistakes;

  return (
    <AppShell>
      <span className="eyebrow">My mistakes</span>
      <h1 style={{ marginTop: 10 }}>Eleven worth returning to</h1>
      <p className="muted" style={{ marginTop: 10 }}>Not every wrong answer lands here — only the ones that point at something. Each leaves once you&apos;ve got it right twice running.</p>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {['All · 11', 'Conceptual · 5', 'Calculation · 3', 'Misread the question · 2', 'Ran out of time · 1'].map((t, i) => (
          <span key={t} className={`pill-tab ${i === 0 ? 'active' : ''}`}>{t}</span>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>{featured.tag}</span>
          <span className="badge" style={{ background: 'var(--secondary-tint)', color: 'var(--primary)' }}>{featured.topic}</span>
          <span className="muted" style={{ fontSize: '0.85rem' }}>{featured.seen}</span>
        </div>
        <h3 style={{ marginTop: 14 }}>{featured.question}</h3>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card-sunk" style={{ background: 'var(--warm-tint)' }}>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>You said</span>
            <div className="num" style={{ fontSize: '1.3rem', marginTop: 6 }}>{featured.you}</div>
          </div>
          <div className="card-sunk" style={{ background: 'var(--success-tint)' }}>
            <span className="eyebrow" style={{ color: 'var(--success)' }}>Answer</span>
            <div className="num" style={{ fontSize: '1.3rem', marginTop: 6 }}>{featured.answer}</div>
          </div>
        </div>
        <div className="card-tint" style={{ marginTop: 16 }}>
          <span className="eyebrow" style={{ color: 'var(--secondary)' }}>✦ Where it turned</span>
          <p style={{ marginTop: 8 }}>{featured.where}</p>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: '0.85rem' }}>
          <div><span className="muted">Mistake type</span><br /><strong>{featured.mistakeType}</strong></div>
          <div><span className="muted">Rests on</span><br /><strong>{featured.restsOn}</strong></div>
          <div><span className="muted">Last attempt</span><br /><strong>{featured.lastAttempt}</strong></div>
          <div><span className="muted">Next review</span><br /><strong style={{ color: 'var(--primary)' }}>{featured.nextReview}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button type="button" className="btn btn-primary">Try it again</button>
          <button type="button" className="btn btn-secondary">Ask the tutor</button>
          <button type="button" className="btn btn-secondary">Reteach the prerequisite</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0 }}>
        {rest.map((m, i) => (
          <div key={m.question} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            padding: '18px 24px', borderTop: i ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <strong>{m.question}</strong>
              <div className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>{m.topic} · {m.meta}</div>
            </div>
            <span className="muted">→</span>
          </div>
        ))}
      </div>

      <div className="card-sunk" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--success)' }}>●</span>
        <span>Four mistakes have left this list in the last fortnight — BODMAS order, decimal place value, and two on simple interest.</span>
      </div>
    </AppShell>
  );
}
