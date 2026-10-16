import Link from 'next/link';
import AppShell from '../../_components/AppShell';
import { ProgressBar } from '../../_components/ui';
import { pyqStats, pyqByTopic } from '../../_data/mock';

export default function PyqAnalysis() {
  return (
    <AppShell>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        <Link href="/pyqs" style={{ color: 'var(--primary)', textDecoration: 'none' }}>PYQs</Link> / Analysis
      </div>
      <h1 style={{ marginTop: 10 }}>What 148 questions revealed</h1>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{pyqStats.attempted}</div><div className="label">attempted</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{pyqStats.correct}</div><div className="label">correct</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{pyqStats.incorrect}</div><div className="label">incorrect</div></div>
          <div className="stat"><div className="num">{pyqStats.accuracy}</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="num">{pyqStats.avgTime}</div><div className="label">average time</div></div>
        </div>
      </div>

      <div className="card-dark" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>What to study next</span>
          <h2 style={{ color: '#fff', marginTop: 10 }}>Your percentage work is exam-ready. Profit and loss is where the marks are going.</h2>
          <p className="muted" style={{ marginTop: 10, maxWidth: 560 }}>
            Nineteen of your 49 misses sit in profit and loss, and almost all of
            them are the same step — working backwards from the selling price.
            That single idea is worth about 6 marks a paper.
          </p>
        </div>
        <Link href="/learn/mathematics/fractions" className="btn btn-light">Open Profit &amp; Loss</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By topic</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {pyqByTopic.map((t) => (
              <div key={t.topic}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t.topic}</span>
                  <strong style={{ color: t.value < 50 ? 'var(--warm-accent)' : undefined }}>{t.value}%</strong>
                </div>
                <ProgressBar value={t.value} color={t.value < 50 ? 'var(--warm-accent)' : t.value < 70 ? '#b58a2f' : 'var(--success)'} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">Mistakes that repeat</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {[
                ['Working back from a result', '11 times · profit & loss, reverse percentage'],
                ['Unmatched denominators', '6 times · fractions, ratio'],
                ['Misread "at least" / "at most"', '4 times · across subjects'],
              ].map(([t, n]) => (
                <div key={t}>
                  <strong style={{ display: 'block' }}>{t}</strong>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{n}</span>
                </div>
              ))}
            </div>
            <Link href="/mistakes" style={{ display: 'inline-block', marginTop: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Open the mistake book →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <Link href="/mistakes" className="btn btn-primary">Practise weak-area PYQs</Link>
        <Link href="/mistakes" className="btn btn-secondary">Retry the 49 I missed</Link>
        <Link href="/tests" className="btn btn-secondary">Take a full mock instead</Link>
      </div>
    </AppShell>
  );
}
