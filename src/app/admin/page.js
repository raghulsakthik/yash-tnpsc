'use client';

import { useEffect, useState } from 'react';
import AdminGuard from './_components/AdminGuard';
import PyqFrequencyPanel from './PyqFrequencyPanel';

function Stat({ value, label, color }) {
  return (
    <div className="stat">
      <div className="num" style={color ? { color } : undefined}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function AnalyticsBody() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/admin/analytics', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load analytics');
        setData(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>;
  if (!data) return <p className="muted">Loading…</p>;

  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <span className="eyebrow">Accounts</span>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <Stat value={data.accounts.learners} label="learner accounts" />
          <Stat value={data.accounts.test} label="test accounts" />
          <Stat value={data.accounts.admins} label="admin accounts" />
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">Content</span>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <Stat value={data.content.subjects} label="subjects" />
          <Stat value={data.content.chapters} label="chapters" />
          <Stat value={data.content.topics} label="topics" />
          <Stat value={data.content.topicsWithContent} label="topics with questions" />
          <Stat value={data.content.publishedQuestions} label="published questions" color="var(--primary)" />
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">Engagement, across every real account</span>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <Stat value={data.engagement.totalAttempts} label="questions answered" />
          <Stat value={`${data.engagement.overallAccuracy}%`} label="overall accuracy" color="var(--success)" />
          <Stat value={data.engagement.testsCompleted} label="tests completed" />
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">Platform activity, last 7 days</span>
        <svg viewBox="0 0 280 90" style={{ width: '100%', maxWidth: 400, height: 90, marginTop: 14 }}>
          {data.last7Days.map((d, i) => {
            const barWidth = 28;
            const gap = 10;
            const x = i * (barWidth + gap);
            const h = Math.max(2, (d.count / maxDay) * 70);
            return (
              <g key={d.date}>
                <rect x={x} y={70 - h} width={barWidth} height={h} rx={4} fill="var(--primary)" />
                <text x={x + barWidth / 2} y={86} textAnchor="middle" fontSize="8" fill="var(--ink-muted)">
                  {d.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <PyqFrequencyPanel />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <h1>Admin</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>Real platform numbers -- nothing here is a placeholder.</p>
      <AnalyticsBody />
    </AdminGuard>
  );
}
