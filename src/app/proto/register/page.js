import Link from 'next/link';

export default function Register() {
  return (
    <main className="shell-main narrow" style={{ paddingTop: 80, maxWidth: 420 }}>
      <p className="eyebrow">Create your account</p>
      <h1 style={{ fontSize: '2rem' }}>Let&apos;s set you up.</h1>
      <p className="muted" style={{ marginTop: 10 }}>Takes under a minute. The real plan comes after a quick placement check.</p>

      <form className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Name
          <input type="text" defaultValue="Yash" style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Email
          <input type="email" placeholder="you@example.com" style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Password
          <input type="password" placeholder="At least 8 characters" style={inputStyle} />
        </label>
        <Link href="/proto/onboarding" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
          Create account
        </Link>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        Already have an account? <Link href="/proto/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Log in</Link>
      </p>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--ground)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-inter)',
};
