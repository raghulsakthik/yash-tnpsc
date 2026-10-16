import Link from 'next/link';

export default function Landing() {
  return (
    <main className="shell-main narrow" style={{ paddingTop: 80 }}>
      <p className="eyebrow">NOVA</p>
      <h1>A calm place to prepare for TNPSC.</h1>
      <p className="muted" style={{ marginTop: 14, fontSize: '1.1rem' }}>
        One small win at a time. Mastery, retention, speed and revision, built into
        every lesson — not bolted on as a progress bar.
      </p>

      <div className="grid-3" style={{ marginTop: 40 }}>
        <div className="card">
          <div style={{ color: 'var(--secondary)', marginBottom: 10 }}>✦</div>
          <h3 style={{ fontSize: '1.1rem' }}>One thing at a time</h3>
          <p className="muted" style={{ marginTop: 8 }}>Every screen tells you what to do next.</p>
        </div>
        <div className="card">
          <div style={{ color: 'var(--secondary)', marginBottom: 10 }}>✦</div>
          <h3 style={{ fontSize: '1.1rem' }}>It remembers for you</h3>
          <p className="muted" style={{ marginTop: 8 }}>What you learn comes back just before you&apos;d forget it.</p>
        </div>
        <div className="card">
          <div style={{ color: 'var(--secondary)', marginBottom: 10 }}>✦</div>
          <h3 style={{ fontSize: '1.1rem' }}>Mistakes are information</h3>
          <p className="muted" style={{ marginTop: 8 }}>A wrong answer changes what comes next, never a mark against you.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
        <Link href="/register" className="btn btn-primary">Start preparing</Link>
        <Link href="/login" className="btn btn-secondary">I already have an account</Link>
      </div>
    </main>
  );
}
