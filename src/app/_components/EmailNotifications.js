'use client';

import { useEffect, useState } from 'react';

export default function EmailNotifications() {
  const [email, setEmail] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/notify/email', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setEmail(data.email);
        setConfigured(data.configured);
        if (!data.email) setEditing(true);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not save that address');
      setEmail(data.email);
      setEditing(false);
      setMessage('Saved.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notify/email/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not send a test email');
      setMessage(`Test sent to ${data.to}.`);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return <p className="muted" style={{ fontSize: '0.85rem' }}>Email is not configured on the server yet.</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ display: 'block' }}>Email notifications</strong>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{email ?? 'No address set yet'}</span>
        </div>
        {!editing && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDraft(email ?? ''); setEditing(true); }}>
            {email ? 'Change' : 'Set up'}
          </button>
        )}
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="you@example.com"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
              fontFamily: 'inherit', fontSize: '0.9rem',
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !draft}>Save</button>
        </div>
      )}

      {email && !editing && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={sendTest} disabled={busy}>
          Send a test
        </button>
      )}

      {message && <p className="muted" style={{ marginTop: 10, fontSize: '0.82rem' }}>{message}</p>}
    </div>
  );
}
