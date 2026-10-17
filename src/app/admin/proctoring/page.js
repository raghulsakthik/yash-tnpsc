import AdminGuard from '../_components/AdminGuard';

export default function AdminProctoring() {
  return (
    <AdminGuard>
      <h1>Proctoring</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>Camera recordings and screen monitoring during tests.</p>

      <div className="card" style={{ borderLeft: '3px solid var(--warm-accent)' }}>
        <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Not built yet</span>
        <p className="muted" style={{ marginTop: 8 }}>
          There is no capture pipeline anywhere in this app -- no client-side camera/screen recording, no upload
          or storage for that media, and no review player. Reviewing test sessions with recordings is a separate,
          sizable piece of work: capturing media in the browser during a test, uploading and storing it
          (video is large -- this needs real file storage, not the database), tying each recording back to a
          specific test attempt, and a review UI here to watch it alongside that attempt&apos;s answers.
        </p>
        <p className="muted" style={{ marginTop: 10 }}>
          Worth scoping as its own task when you&apos;re ready to invest in it, rather than bolted on here.
        </p>
      </div>
    </AdminGuard>
  );
}
