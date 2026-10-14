import Link from 'next/link';
import { ProgressRing, ProgressBar } from '../../../_components/ui';
import { testResult } from '../../../_data/mock';

export default function TestResult() {
  const r = testResult;
  return (
    <main className="shell-main" style={{ maxWidth: 1000, paddingTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <span className="badge badge-learning">WEEKLY TEST · WEEK {r.week}</span>
          <h1 style={{ marginTop: 14 }}>{r.score} out of {r.total}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 520 }}>
            Eleven marks up on last week. The gain is almost entirely mathematics —
            the subject you have been working hardest on.
          </p>
        </div>
        <ProgressRing value={Math.round((r.score / r.total) * 100)} label="score" size={110} />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{r.total}</div><div className="label">attempted</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{r.score}</div><div className="label">correct</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{r.total - r.score}</div><div className="label">incorrect</div></div>
          <div className="stat"><div className="num">{r.accuracy}</div><div className="label">accuracy</div></div>
          <div className="stat"><div className="num">{r.perQuestion}</div><div className="label">per question</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{r.vsLastWeek}</div><div className="label">vs last week</div></div>
        </div>
      </div>

      <div className="card-dark" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>What the paper says</span>
          <h3 style={{ color: '#fff', marginTop: 10 }}>Six of your eight misses were conceptual, not calculation.</h3>
          <p className="muted" style={{ marginTop: 8, maxWidth: 560 }}>
            You are not making arithmetic slips any more — that was last month&apos;s
            problem. What is left is choosing the wrong approach, and five of the
            six sit in percentage and ratio. One idea, repeated.
          </p>
        </div>
        <Link href="/proto/revision" className="btn btn-light">Start the revision</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By subject</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {r.bySubject.map((s) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{s.name}</span>
                  <strong>{s.score}/{s.total}</strong>
                </div>
                <ProgressBar value={(s.score / s.total) * 100} color="var(--success)" />
              </div>
            ))}
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="card-sunk" style={{ background: 'var(--success-tint)' }}>
              <span className="eyebrow" style={{ color: 'var(--success)' }}>Strong</span>
              <p style={{ marginTop: 6, fontSize: '0.9rem' }}>{r.strong}</p>
            </div>
            <div className="card-sunk" style={{ background: 'var(--warm-tint)' }}>
              <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Needs work</span>
              <p style={{ marginTop: 6, fontSize: '0.9rem' }}>{r.needsWork}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">Time spent</span>
            <div className="stat-row" style={{ marginTop: 14 }}>
              <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{r.time.fast}</div><div className="label">fast</div></div>
              <div className="stat"><div className="num">{r.time.normal}</div><div className="label">normal</div></div>
              <div className="stat"><div className="num" style={{ color: 'var(--warm-accent)' }}>{r.time.slow}</div><div className="label">slow</div></div>
            </div>
            <p className="muted" style={{ marginTop: 12, fontSize: '0.85rem' }}>You finished with 9 minutes spare. Four of the six slow questions were also wrong.</p>
          </div>
          <div className="card">
            <span className="eyebrow">Confidence vs result</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {r.confidence.map((c) => (
                <div key={c.label} className="card-sunk" style={{ padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.label}</span>
                  <span className="num">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Link href="/proto/tests/weekly/review" className="btn btn-secondary btn-block" style={{ marginTop: 20 }}>
        Review every answer
      </Link>
    </main>
  );
}
