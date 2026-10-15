'use client';

import AppShell from '../_components/AppShell';
import { useProfile } from '../../../hooks/useProfile';
import { useJourney } from '../../../hooks/useJourney';
import { usePyqsOverview } from '../../../hooks/usePyqsOverview';
import { useNotifications } from '../../../hooks/useNotifications';
import { useMilestones } from '../../../hooks/useMilestones';
import { exportProfileUrl } from '../../../api/profile.api';

const DURATIONS = [15, 30, 45, 60];
const TIMES = ['Early morning', 'Afternoon', 'Evening', 'Late night'];
const REST_DAYS = ['Saturday', 'Sunday', 'No fixed day'];
const BIASES = ['gentle', 'normal', 'hard'];
const PREF_LABELS = [
  ['dailyReminder', 'Daily reminder', 'One, at your study time'],
  ['revisionDueAlert', 'Revision due', 'When something needs rescuing'],
  ['streakAtRisk', 'Streak at risk', 'Only on the evening it would break'],
  ['milestoneAlert', 'Milestones', 'When you actually earn one'],
  ['weeklyReview', 'Weekly review', 'Sunday evening'],
];

function PillGroup({ options, value, onChange, format = (x) => x }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="pill-tab"
          style={value === o ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
          onClick={() => onChange(o)}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 40, height: 22, borderRadius: 11, background: on ? 'var(--primary)' : 'var(--paper-sunk)',
        position: 'relative', display: 'inline-block', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 20 : 2 }} />
    </button>
  );
}

export default function Profile() {
  const { profile, save } = useProfile();
  const { journey } = useJourney();
  const { overview: pyqs } = usePyqsOverview();
  const { prefs, togglePref } = useNotifications();
  const { items: milestones } = useMilestones();

  const earnedCount = milestones?.filter((m) => m.earned).length ?? 0;

  return (
    <AppShell>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>Y</div>
        <div>
          <h2>Yash</h2>
          <p className="muted">Preparing for TNPSC Group 2 · CCSE-II</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
              {journey?.streak?.current ?? 0} day streak
            </span>
            <span className="badge badge-mastered">{earnedCount} milestones</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{journey?.questionsSolved ?? '—'}</div><div className="label">questions solved</div></div>
          <div className="stat"><div className="num">{journey?.topicsMastered ?? '—'}</div><div className="label">topics mastered</div></div>
          <div className="stat"><div className="num">{pyqs?.attempted ?? '—'}</div><div className="label">PYQs completed</div></div>
          <div className="stat"><div className="num">{journey?.completedTests ?? '—'}</div><div className="label">tests completed</div></div>
          <div className="stat"><div className="num">{journey?.streak?.longest ?? '—'}</div><div className="label">longest streak</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">How you learn</span>
          {!profile ? (
            <p className="muted" style={{ marginTop: 10 }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 14 }}>
              <div>
                <strong>Daily goal</strong>
                <div style={{ marginTop: 8 }}>
                  <PillGroup
                    options={DURATIONS}
                    value={profile.dailyGoalMinutes}
                    onChange={(v) => save({ dailyGoalMinutes: v })}
                    format={(v) => `${v} min`}
                  />
                </div>
              </div>
              <div>
                <strong>Preferred time</strong>
                <div style={{ marginTop: 8 }}>
                  <PillGroup options={TIMES} value={profile.preferredTime} onChange={(v) => save({ preferredTime: v })} />
                </div>
              </div>
              <div>
                <strong>Rest day</strong>
                <div style={{ marginTop: 8 }}>
                  <PillGroup options={REST_DAYS} value={profile.restDay} onChange={(v) => save({ restDay: v })} />
                </div>
              </div>
              <div>
                <strong>Language</strong>
                <div style={{ marginTop: 8 }}>
                  <PillGroup
                    options={['en', 'ta']}
                    value={profile.language}
                    onChange={(v) => save({ language: v })}
                    format={(v) => (v === 'en' ? 'English' : 'Tamil')}
                  />
                </div>
              </div>
              <div>
                <strong>Difficulty</strong>
                <p className="muted" style={{ marginTop: 2, fontSize: '0.8rem' }}>How hard the adaptive engine pushes — shifts where new questions start, nothing more.</p>
                <div style={{ marginTop: 8 }}>
                  <PillGroup
                    options={BIASES}
                    value={profile.difficultyBias}
                    onChange={(v) => save({ difficultyBias: v })}
                    format={(v) => v[0].toUpperCase() + v.slice(1)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <span className="eyebrow">Notifications</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {PREF_LABELS.map(([key, label, note]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block' }}>{label}</strong>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{note}</span>
                </div>
                <Toggle on={Boolean(prefs?.[key])} onClick={() => togglePref(key)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">App</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <strong>Export my learning data</strong>
          <a href={exportProfileUrl} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
            Download →
          </a>
        </div>
      </div>
    </AppShell>
  );
}
