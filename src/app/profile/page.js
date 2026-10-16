'use client';

import { useEffect, useState } from 'react';
import AppShell from '../_components/AppShell';
import PushNotifications from '../_components/PushNotifications';
import EmailNotifications from '../_components/EmailNotifications';

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
          <div style={{ marginTop: 14 }}>
            <PushNotifications />
          </div>
          <hr className="rule" style={{ margin: '16px 0' }} />
          <EmailNotifications />
          <p className="muted" style={{ marginTop: 14, fontSize: '0.82rem' }}>
            One on/off switch for now — picking which events notify you
            (revision due, streak at risk, …) isn&apos;t built yet.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
