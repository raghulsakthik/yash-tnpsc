'use client';

import { useEffect, useState } from 'react';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ActivityGraph() {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/progress/activity', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load activity');
        setDays(d.days);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="muted" style={{ fontSize: '0.85rem' }}>{error}</p>;
  if (!days) return <p className="muted">Loading…</p>;

  const max = Math.max(1, ...days.map((d) => d.count));
  const barWidth = 20;
  const gap = 8;
  const chartHeight = 80;
  const width = days.length * (barWidth + gap);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="eyebrow">Last 14 days</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {days.reduce((sum, d) => sum + d.count, 0)} questions
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${chartHeight + 24}`}
        style={{ width: '100%', height: 110, marginTop: 14 }}
        role="img"
        aria-label="Questions answered per day over the last 14 days"
      >
        {days.map((d, i) => {
          const barHeight = d.count === 0 ? 2 : Math.max(4, (d.count / max) * chartHeight);
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          const date = new Date(d.date + 'T00:00:00');
          const isToday = i === days.length - 1;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={d.count === 0 ? 'var(--border)' : isToday ? 'var(--warm-accent)' : 'var(--primary)'}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 18}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ink-muted)"
              >
                {WEEKDAY[date.getDay()]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
