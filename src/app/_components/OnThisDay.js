'use client';

import { useEffect, useState } from 'react';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' });

/**
 * A small, real general-knowledge widget for Home -- real historical events
 * for today's date, pulled live from Wikipedia's open "On this day" API.
 * Silently renders nothing if the API is unreachable (optional content,
 * never worth an error state on the home page).
 */
export default function OnThisDay() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    fetch('/api/on-this-day', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.events) setEvents(data.events);
      })
      .catch(() => {});
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <span className="eyebrow">On this day · {DATE_FORMATTER.format(new Date())}</span>
      <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem' }}>Real general-knowledge facts, live from Wikipedia.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <strong className="num" style={{ color: 'var(--primary)', flexShrink: 0, width: 52 }}>{e.year}</strong>
            <span style={{ fontSize: '0.88rem' }}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
