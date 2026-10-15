'use client';

import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { useNotifications } from '../../../hooks/useNotifications';

const PREF_LABELS = [
  ['dailyReminder', 'Daily reminder'],
  ['revisionDueAlert', 'Revision due'],
  ['streakAtRisk', 'Streak at risk'],
  ['milestoneAlert', 'Milestones'],
  ['weeklyReview', 'Weekly review'],
];

export default function Notifications() {
  const { items, prefs, error, togglePref } = useNotifications();

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <span className="eyebrow">Notifications</span>
          <h1 style={{ marginTop: 10 }}>What&apos;s true right now</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Live, not a queue — this re-checks every time you open it, so nothing here can go stale.
          </p>
        </div>
      </div>

      {error && (
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          {items === null && <p className="muted" style={{ padding: 24 }}>Loading…</p>}
          {items?.length === 0 && <p className="muted" style={{ padding: 24 }}>Nothing right now — all caught up.</p>}
          {items?.map((item, i) => (
            <Link
              key={`${item.type}-${i}`}
              href={item.href}
              style={{
                display: 'flex', gap: 14, padding: '16px 24px',
                borderTop: i ? '1px solid var(--border)' : 'none',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warm-accent)', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong>{item.title}</strong>
              </div>
            </Link>
          ))}
        </div>

        <div className="card">
          <span className="eyebrow">How NOVA notifies</span>
          <p className="muted" style={{ marginTop: 10 }}>
            Each toggle below only ever reflects something real — there is no delivery schedule behind it, just whether that condition is allowed to show up in the feed on the left.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {PREF_LABELS.map(([key, label]) => {
              const on = Boolean(prefs?.[key]);
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => togglePref(key)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, background: on ? 'var(--primary)' : 'var(--paper-sunk)',
                      position: 'relative', display: 'inline-block', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                      left: on ? 20 : 2, transition: 'left 0.15s',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
