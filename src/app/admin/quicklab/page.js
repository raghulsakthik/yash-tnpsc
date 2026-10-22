'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

export default function AdminQuicklab() {
  const [modes, setModes] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    fetch('/api/admin/quicklab/modes', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setModes(d.modes ?? []))
      .catch(() => setError('Could not load Quick Lab modes'));
  }

  useEffect(load, []);

  async function patch(modeKey, body) {
    setModes((prev) => prev.map((m) => (m.modeKey === modeKey ? { ...m, ...body } : m)));
    try {
      const res = await fetch(`/api/admin/quicklab/modes/${modeKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not save');
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  return (
    <AdminGuard>
      <h1>Quick Lab</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Quick Lab&apos;s question generators are procedural code (arithmetic, percentages, fractions...), not
        database content -- that part isn&apos;t editable here. What is: which modes learners can see, their
        display name and description, and which one is flagged &quot;recommended&quot;.
      </p>

      {error && <div className="card" style={{ marginBottom: 16, background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!modes && <p className="muted">Loading…</p>}

      {modes?.map((m) => (
        <div key={m.modeKey} className="card" style={{ marginBottom: 12, opacity: m.enabled ? 1 : 0.55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={m.displayName}
                onChange={(e) => patch(m.modeKey, { displayName: e.target.value })}
                style={{ fontWeight: 700, fontSize: '1rem', border: 'none', background: 'transparent', padding: 0, width: '100%' }}
              />
              <textarea
                rows={2}
                value={m.description}
                onChange={(e) => patch(m.modeKey, { description: e.target.value })}
                style={{ marginTop: 6, width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
              <span className="muted" style={{ fontSize: '0.74rem' }}>{m.modeKey}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                <input type="checkbox" checked={m.enabled} onChange={(e) => patch(m.modeKey, { enabled: e.target.checked })} />
                Enabled
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                <input type="checkbox" checked={m.recommended} onChange={(e) => patch(m.modeKey, { recommended: e.target.checked })} />
                Recommended
              </label>
            </div>
          </div>
        </div>
      ))}
    </AdminGuard>
  );
}
