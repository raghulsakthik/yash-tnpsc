import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { quickLabModes } from '../_data/mock';

export default function QuickLab() {
  return (
    <AppShell>
      <span className="eyebrow">Quick Lab</span>
      <h1 style={{ marginTop: 10 }}>Two minutes, sharper arithmetic</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        The exam is won on speed as much as accuracy. Every round here also tells
        the system where your calculation is slow — it isn&apos;t a separate toy.
      </p>

      <div className="card-dark" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Today&apos;s challenge · chosen for you</span>
          <h2 style={{ marginTop: 10, color: '#fff' }}>Percentage Rush · 10 questions in 2 minutes</h2>
          <p className="muted" style={{ marginTop: 10, maxWidth: 520 }}>
            Your percentage accuracy is 92% but your average answer takes 8.4
            seconds. Accuracy is not the problem — this is where the time goes.
          </p>
        </div>
        <Link href="/proto/quick-lab/percentage-rush" className="btn btn-light">Start challenge</Link>
      </div>

      <div className="grid-3" style={{ marginTop: 20 }}>
        {quickLabModes.map((m) => (
          <Link
            key={m.slug}
            href={`/proto/quick-lab/${m.slug}`}
            className="card"
            style={{
              textDecoration: 'none', color: 'inherit',
              border: m.recommended ? '2px solid var(--warm-accent)' : undefined,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'var(--warm-tint)', color: 'var(--warm-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>✦</div>
            <h3 style={{ fontSize: '1.1rem' }}>{m.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.88rem' }}>{m.desc}</p>
            <hr className="rule" style={{ margin: '14px 0 10px' }} />
            <span style={{ fontSize: '0.85rem', color: m.recommended ? 'var(--warm-accent)' : 'var(--ink-muted)', fontWeight: m.recommended ? 600 : 400 }}>
              {m.stat}
            </span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">What a round changes</span>
        <p style={{ marginTop: 10 }}>
          Every answer sends accuracy, response time and difficulty back to the same
          learner model your lessons and tests feed. Which is why yesterday&apos;s
          Percentage Rush is the reason today&apos;s home screen says &quot;build
          speed&quot; instead of &quot;practise more&quot;.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {['accuracy', 'response time', 'combo', 'difficulty reached', 'improvement'].map((t) => (
            <span key={t} className="badge" style={{ background: 'var(--paper-sunk)', color: 'var(--ink-muted)' }}>{t}</span>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
