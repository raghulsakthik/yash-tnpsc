'use client';

import { useEffect, useState } from 'react';
import AppShell from '../_components/AppShell';

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

const EXAM_LABELS = {
  'tnpsc-prelims-495': 'TNPSC Group 2 · CCSE-II',
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load your profile');
        setProfile(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <AppShell>
        <div className="card" style={{ background: 'var(--warm-tint)' }}>
          <p>Could not load your profile: {error}</p>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="muted">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
          {profile.name?.[0]?.toUpperCase() ?? 'Y'}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p className="muted">
            Preparing for {EXAM_LABELS[profile.exam] ?? profile.exam} · started{' '}
            {new Date(profile.since).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
              {profile.streak} day streak
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{profile.questionsSolved}</div><div className="label">questions solved</div></div>
          <div className="stat"><div className="num">{profile.topicsMastered}</div><div className="label">topics mastered</div></div>
          <div className="stat"><div className="num">{profile.testsCompleted}</div><div className="label">tests completed</div></div>
          <div className="stat"><div className="num">{profile.longestStreak}</div><div className="label">longest streak</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">How you learn</span>
          <Row label="Daily goal" note="The session is planned to fit this" value={`${profile.dailyGoalMinutes} minutes`} />
          <Row label="Language" note="Which paper's content is served" value={profile.language === 'ta' ? 'Tamil' : 'English'} />
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
          <p className="muted" style={{ marginTop: 14, fontSize: '0.82rem' }}>
            Not wired up yet — these preferences aren&apos;t saved anywhere.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
