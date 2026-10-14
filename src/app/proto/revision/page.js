import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';
import { revisionDue, comingUp } from '../_data/mock';

export default function Revision() {
  return (
    <AppShell>
      <span className="eyebrow">Revision</span>
      <h1 style={{ marginTop: 10 }}>Keep what you&apos;ve learned</h1>
      <p className="muted" style={{ marginTop: 10 }}>Three concepts are due today. Everything else is still holding — you&apos;ll be told when that changes.</p>

      <div className="grid-3" style={{ marginTop: 24 }}>
        <div className="card-tint">
          <h3 style={{ fontSize: '1.2rem' }}>Quick revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>One question per due concept. About 6 minutes.</p>
          <Link href="/proto/practice/percentage" style={{ display: 'inline-block', marginTop: 14, color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Start →</Link>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.2rem' }}>Deep revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>Concept recap, then four questions each. About 20 minutes.</p>
          <Link href="/proto/practice/percentage" style={{ display: 'inline-block', marginTop: 14, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Start →</Link>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1.2rem' }}>Mistake revision</h3>
          <p className="muted" style={{ marginTop: 8 }}>Only questions you&apos;ve got wrong before. 11 waiting.</p>
          <Link href="/proto/mistakes" style={{ display: 'inline-block', marginTop: 14, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Open →</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        {['Due today · 3', 'Upcoming · 7', 'Weak memory · 2', 'Recently learned · 5', 'Retained · 14'].map((t, i) => (
          <span key={t} className={`pill-tab ${i === 0 ? 'active' : ''}`}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {revisionDue.map((r) => (
          <div key={r.name} className={r.highlight ? 'card-tint' : 'card'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.3rem' }}>{r.name}</h3>
                <span className={`badge ${r.highlight ? 'badge-revision-due' : 'badge-mastered'}`}>{r.badge}</span>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>{r.note}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, maxWidth: 320 }}>
                <ProgressBar value={r.progress} color={r.highlight ? 'var(--secondary)' : 'var(--primary)'} />
                <strong style={{ fontSize: '0.85rem' }}>{r.progress}%</strong>
              </div>
            </div>
            <Link href="/proto/practice/percentage" className="btn btn-primary">Review</Link>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">Coming up</span>
        <div style={{ marginTop: 12 }}>
          {comingUp.map((c, i) => (
            <div key={c.name} style={{
              display: 'flex', justifyContent: 'space-between', padding: '12px 0',
              borderTop: i ? '1px solid var(--border)' : 'none',
            }}>
              <strong>{c.name}</strong>
              <span className="muted">{c.when}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
