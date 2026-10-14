import Link from 'next/link';

export default function Login() {
  return (
    <main className="shell-main narrow" style={{ paddingTop: 80, maxWidth: 420 }}>
      <p className="eyebrow">Welcome back</p>
      <h1 style={{ fontSize: '2rem' }}>Good to see you, Yash.</h1>
      <p className="muted" style={{ marginTop: 10 }}>Pick up where you left off — Fractions is at 72%.</p>

      <form className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Email
          <input type="email" defaultValue="yash@example.com" style={inputStyle} />
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Password
          <input type="password" defaultValue="••••••••" style={inputStyle} />
        </label>
        <Link href="/proto/home" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
          Log in
        </Link>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        New here? <Link href="/proto/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create an account</Link>
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
