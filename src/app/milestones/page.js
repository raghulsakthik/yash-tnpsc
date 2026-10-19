import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';
import { milestones } from '../_data/mock';

export default function Milestones() {
  const m = milestones;
  return (
    <AppShell>
      <span className="eyebrow">Milestones</span>
      <h1 style={{ marginTop: 10 }}>Six earned, and none of them for turning up</h1>
      <p className="muted" style={{ marginTop: 10 }}>Each one takes real evidence — a topic that holds at review, a paper completed, a streak of genuine sessions.</p>

      <div className="card" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow">Learning streak · the only one that counts</span>
          <div className="num" style={{ fontSize: '2.5rem', color: 'var(--warm-accent)', marginTop: 8 }}>{m.streak.current} <span className="muted" style={{ fontSize: '1rem' }}>days · longest was {m.streak.longest}</span></div>
          <p className="muted" style={{ marginTop: 10, maxWidth: 480 }}>
            A day counts when you complete twenty focused minutes or a full session
            — not when you open the app. Two freezes are left for the month, so one
            bad day does not erase six weeks.
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: 6,
                background: i < m.streak.current ? 'var(--warm-accent)' : 'var(--paper-sunk)',
              }} />
            ))}
          </div>
        </div>
        <div className="card-sunk">
          <span className="eyebrow">Secondary streaks</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Practice</span><strong>{m.streak.secondary.practice} days</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Revision</span><strong>{m.streak.secondary.revision} days</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><span>Weekly consistency</span><strong>{m.streak.secondary.weekly}</strong></div>
          </div>
        </div>
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Earned</span>
      <div className="grid-3">
        {m.earned.map((e) => (
          <div key={e.name} className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>✦</span>
              <div>
                <strong>{e.name}</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{e.note}</p>
                <span className="muted" style={{ fontSize: '0.78rem', color: 'var(--success)' }}>{e.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>In progress</span>
      <div className="grid-3">
        {m.inProgress.map((e) => (
          <div key={e.name} className="card">
            <strong>{e.name}</strong>
            <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{e.note}</p>
            <div style={{ marginTop: 10 }}><ProgressBar value={e.progress} color="var(--warm-accent)" /></div>
            <span className="muted" style={{ fontSize: '0.78rem' }}>{e.meta}</span>
          </div>
        ))}
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>Ahead</span>
      <div className="grid-3">
        {m.ahead.map((e) => (
          <div key={e.name} className="card" style={{ opacity: 0.6, border: '1px dashed var(--border)' }}>
            <strong>{e.name}</strong>
            <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{e.note}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
