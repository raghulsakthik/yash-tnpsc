import AppShell from '../_components/AppShell';
import { notifications } from '../_data/mock';

export default function Notifications() {
  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <span className="eyebrow">Notifications</span>
          <h1 style={{ marginTop: 10 }}>What NOVA has told you</h1>
        </div>
        <button type="button" className="btn btn-secondary">Mark all as read</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {['All', 'Learning', 'Revision', 'Tests', 'Milestones'].map((t, i) => (
          <span key={t} className={`pill-tab ${i === 0 ? 'active' : ''}`}>{t}</span>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          {notifications.map((group) => (
            <div key={group.group}>
              <div className="muted" style={{ padding: '14px 24px 8px', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{group.group}</div>
              {group.items.map((item, i) => (
                <div key={item.title} style={{
                  display: 'flex', gap: 14, padding: '14px 24px',
                  borderTop: '1px solid var(--border)',
                }}>
                  {item.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warm-accent)', marginTop: 6, flexShrink: 0 }} />}
                  <div style={{ flex: 1, marginLeft: item.unread ? 0 : 22 }}>
                    <strong>{item.title}</strong>
                    <p className="muted" style={{ marginTop: 4, fontSize: '0.88rem' }}>{item.note}</p>
                  </div>
                  <span className="muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{item.time}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <span className="eyebrow">How NOVA notifies</span>
          <p className="muted" style={{ marginTop: 10 }}>
            One reminder a day at most, at 7 pm, before your usual session.
            Everything else waits here quietly.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {[['Daily reminder', true], ['Memory Echo', true], ['Milestones', true], ['Test unlocks', false]].map(([label, on]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{label}</span>
                <span style={{
                  width: 40, height: 22, borderRadius: 11, background: on ? 'var(--primary)' : 'var(--paper-sunk)',
                  position: 'relative', display: 'inline-block',
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                    left: on ? 20 : 2,
                  }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
