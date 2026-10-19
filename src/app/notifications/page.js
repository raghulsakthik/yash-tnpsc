'use client';

import { useEffect, useState } from 'react';
import AppShell from '../_components/AppShell';

function formatRelative(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/notifications', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load notifications');
        setItems(d.items);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <span className="eyebrow">Notifications</span>
      <h1 style={{ marginTop: 10 }}>Everything, in one place</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Every achievement unlocked and every nudge sent -- the same ones that went to push, email or WhatsApp,
        now visible here too.
      </p>

      {error && <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!items && !error && <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}
      {items?.length === 0 && <div className="card" style={{ marginTop: 20 }}><p className="muted">Nothing yet.</p></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {items?.map((item, i) => (
          <div key={i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{item.title}</strong>
                <span className="muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatRelative(item.at)}</span>
              </div>
              {item.body && <p className="muted" style={{ marginTop: 6, fontSize: '0.88rem' }}>{item.body}</p>}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
