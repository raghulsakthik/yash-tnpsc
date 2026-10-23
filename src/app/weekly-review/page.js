'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../_components/AppShell';

function pct(value) {
  const n = Number(value ?? 0);
  return `${Math.round(n)}%`;
}

export default function WeeklyReview() {
  const [analytics, setAnalytics] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/learning/analytics').then((r) => r.ok ? r.json() : Promise.reject(new Error('Analytics unavailable'))),
      fetch(`/api/progress/calendar?month=${new Date().toISOString().slice(0, 7)}`).then((r) => r.ok ? r.json() : Promise.reject(new Error('Calendar unavailable'))),
      fetch('/api/tests').then((r) => r.ok ? r.json() : Promise.reject(new Error('Test history unavailable'))),
    ])
      .then(([a, c, h]) => {
        if (cancelled) return;
        setAnalytics(a);
        setCalendar(c);
        setHistory(h);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const weekDays = useMemo(() => {
    const byDate = new Map((calendar?.days ?? []).map((d) => [d.date, d.count]));
    const out = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), count: byDate.get(key) ?? 0 });
    }
    return out;
  }, [calendar]);

  const topics = analytics?.topics ?? [];
  const strongest = [...topics].filter((t) => Number(t.attempts) > 0).sort((a, b) => Number(b.accuracy) - Number(a.accuracy)).slice(0, 3);
  const focusTopics = [...topics].filter((t) => Number(t.attempts) > 0).sort((a, b) => Number(a.accuracy) - Number(b.accuracy)).slice(0, 3);
  const attempts = Number(analytics?.attempts?.total ?? 0);
  const correct = Number(analytics?.attempts?.correct ?? 0);
  const accuracy = attempts ? (correct / attempts) * 100 : 0;
  const completedTests = Number(analytics?.tests?.completed ?? 0);
  const averageTest = Number(analytics?.tests?.averageScore ?? 0);
  const weekActivity = weekDays.reduce((sum, d) => sum + Number(d.count || 0), 0);
  const latestCompleted = (history?.tests ?? []).find((t) => t.status === 'COMPLETED');
  const focus = focusTopics[0];

  if (error) return <AppShell><div className="card"><h2>Weekly review unavailable</h2><p className="muted" style={{ marginTop: 8 }}>{error}</p></div></AppShell>;
  if (!analytics || !calendar || !history) return <AppShell><div className="card"><p className="muted">Loading your real learning data…</p></div></AppShell>;

  return (
    <AppShell>
      <span className="badge badge-learning">WEEKLY REVIEW · LAST 7 DAYS</span>
      <h1 style={{ marginTop: 14 }}>Your week, based on what you actually did</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        This review is generated from your attempts, test history, topic mastery and activity calendar. No sample learner data is used here.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="stat-row" style={{ justifyContent: 'space-between' }}>
          <div className="stat"><div className="num">{weekActivity}</div><div className="label">activity events</div></div>
          <div className="stat"><div className="num">{attempts}</div><div className="label">questions attempted</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--success)' }}>{pct(accuracy)}</div><div className="label">overall accuracy</div></div>
          <div className="stat"><div className="num">{completedTests}</div><div className="label">tests completed</div></div>
          <div className="stat"><div className="num">{pct(averageTest)}</div><div className="label">test average</div></div>
          <div className="stat"><div className="num">{focusTopics.length}</div><div className="label">focus topics</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow" style={{ color: 'var(--success)' }}>Strongest areas</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {strongest.length ? strongest.map((item) => (
              <div key={item.topicId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.topicName}</span><strong>{pct(item.accuracy)}</strong>
              </div>
            )) : <p className="muted">Complete a few practice questions to establish your strongest areas.</p>}
          </div>
        </div>
        <div className="card">
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Needs focus</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {focusTopics.length ? focusTopics.map((item) => (
              <div key={item.topicId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.topicName}</span><span className="muted">{pct(item.accuracy)} · {item.attempts} attempts</span>
              </div>
            )) : <p className="muted">No weak area is established yet.</p>}
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>Focus is derived from the lowest recorded topic accuracy, not a static recommendation.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">Consistency · last 7 days</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 14 }}>
          {weekDays.map((d) => (
            <div key={d.key} style={{ textAlign: 'center' }}>
              <div style={{ aspectRatio: '1', borderRadius: 6, background: d.count === 0 ? 'var(--paper-sunk)' : `rgba(21,112,79,${Math.min(0.85, 0.25 + d.count * 0.15)})` }} title={`${d.key}: ${d.count} activity events`} />
              <small className="muted">{d.label}</small>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 14 }}>Activity counts come from the real progress calendar for the current month.</p>
      </div>

      <div className="card-dark" style={{ marginTop: 16 }}>
        <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>NEXT FOCUS</span>
        <h3 style={{ color: '#fff', marginTop: 10 }}>{focus ? focus.topicName : 'Build your first learning signal'}</h3>
        <div className="grid-3" style={{ marginTop: 16 }}>
          <div style={{ background: '#2a241c', borderRadius: 12, padding: 16 }}><span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>01</span><p style={{ marginTop: 8, fontSize: '0.9rem' }}>Review the concept and explanation.</p></div>
          <div style={{ background: '#2a241c', borderRadius: 12, padding: 16 }}><span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>02</span><p style={{ marginTop: 8, fontSize: '0.9rem' }}>Practice targeted questions and record confidence.</p></div>
          <div style={{ background: '#2a241c', borderRadius: 12, padding: 16 }}><span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>03</span><p style={{ marginTop: 8, fontSize: '0.9rem' }}>{latestCompleted ? `Recheck performance after your latest completed test (${pct(latestCompleted.score)}).` : 'Complete a test to create a stronger performance signal.'}</p></div>
        </div>
      </div>
    </AppShell>
  );
}