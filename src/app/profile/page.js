import AppShell from '../_components/AppShell';
import { learner } from '../_data/mock';

function Toggle({ on }) {
  return (
    <span style={{
      width: 40, height: 22, borderRadius: 11, background: on ? 'var(--primary)' : 'var(--paper-sunk)',
      position: 'relative', display: 'inline-block',
    }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2 }} />
    </span>
  );
}

function Row({ label, note, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
      <div>
        <strong style={{ display: 'block' }}>{label}</strong>
        {note && <span className="muted" style={{ fontSize: '0.8rem' }}>{note}</span>}
      </div>
      <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>{value} ›</span>
    </div>
  );
}

export default function Profile() {
  return (
    <AppShell>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>Y</div>
        <div>
          <h2>{learner.name}</h2>
          <p className="muted">Preparing for {learner.exam.split(' · ')[0]} · started {learner.since}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>{learner.streak} day streak</span>
            <span className="badge badge-mastered">6 milestones</span>
            <span className="badge badge-learning">Level {learner.level} · {learner.xp} XP</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{learner.totalLearning}</div><div className="label">total learning</div></div>
          <div className="stat"><div className="num">{learner.questionsSolved}</div><div className="label">questions solved</div></div>
          <div className="stat"><div className="num">{learner.topicsMastered}</div><div className="label">topics mastered</div></div>
          <div className="stat"><div className="num">{learner.pyqsCompleted}</div><div className="label">PYQs completed</div></div>
          <div className="stat"><div className="num">{learner.testsCompleted}</div><div className="label">tests completed</div></div>
          <div className="stat"><div className="num">14</div><div className="label">longest streak</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">How you learn</span>
          <Row label="Daily goal" note="The session is planned to fit this" value="30 minutes" />
          <Row label="Preferred time" note="Reminders arrive just before" value="Evening · 7pm" />
          <Row label="Rest day" note="Protects the streak rather than breaking it" value="Sunday" />
          <Row label="Language" note="Switchable per session" value="Tamil & English" />
          <Row label="Difficulty" note="How hard the adaptive engine pushes" value="Gentle" />
        </div>
        <div className="card">
          <span className="eyebrow">Notifications</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {[
              ['Daily reminder', 'One, at your study time', true],
              ['Revision due', 'When something needs rescuing', true],
              ['Streak at risk', 'Only on the evening it would break', true],
              ['Milestones', 'When you actually earn one', true],
              ['Weekly review', 'Sunday evening', false],
            ].map(([label, note, on]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block' }}>{label}</strong>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{note}</span>
                </div>
                <Toggle on={on} />
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: '0.82rem' }}>Never more than two a day, and none at all on your rest day.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">App</span>
        <Row label="Download lessons for offline use" note="184 MB cached" value="On" />
        <Row label="Theme" value="Follow system" />
        <Row label="Account" value="Manage" />
        <Row label="Export my learning data" value="Download" />
      </div>
    </AppShell>
  );
}
