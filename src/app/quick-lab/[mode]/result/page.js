import Link from 'next/link';
import { quickLabResult } from '../../../_data/mock';

export default async function QuickLabResult({ params }) {
  const { mode } = await params;
  return (
    <main className="narrow" style={{ margin: '0 auto', padding: '48px 24px' }}>
      <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
        {mode.replace('-', ' ')} · Level 3
      </span>
      <h1 style={{ marginTop: 14 }}>{quickLabResult.title}</h1>
      <p className="muted" style={{ marginTop: 10 }}>{quickLabResult.subtitle}</p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          {quickLabResult.stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="num" style={{ color: s.label === 'accuracy' ? 'var(--success)' : s.label === 'XP' ? 'var(--warm-accent)' : 'inherit' }}>{s.value}</div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-tint" style={{ marginTop: 16 }}>
        <span className="eyebrow" style={{ color: 'var(--secondary)' }}>✦ What this changed</span>
        <p style={{ marginTop: 10 }}>
          Percentage speed moved from 63% to 71%. That is enough to lift Percentage
          out of &quot;near mastery&quot; once one more review lands.
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {quickLabResult.rounds.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 0',
            borderTop: i ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ color: r.correct ? 'inherit' : 'var(--warm-accent)' }}>
              {r.correct ? '✓' : '!'} {r.label}
            </span>
            <span className="muted">{r.time}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <Link href={`/quick-lab/${mode}`} className="btn btn-primary">Play again</Link>
        <Link href="/quick-lab" className="btn btn-secondary">Back to Quick Lab</Link>
      </div>
    </main>
  );
}
