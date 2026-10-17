import Link from 'next/link';

export default function Register() {
  return (
    <main className="shell-main narrow" style={{ paddingTop: 80, maxWidth: 420 }}>
      <p className="eyebrow">Accounts</p>
      <h1 style={{ fontSize: '2rem' }}>Accounts are set up for you.</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        This app runs with three fixed logins: a test account for trying things
        safely, Yashika&apos;s real account, and an admin account for managing
        content. Ask whoever set this up for your login, or use the test account
        to look around.
      </p>

      <Link href="/login" className="btn btn-primary btn-block" style={{ marginTop: 24 }}>
        Back to login
      </Link>
    </main>
  );
}
