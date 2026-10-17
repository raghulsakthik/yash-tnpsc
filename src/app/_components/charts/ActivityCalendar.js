'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function intensity(count) {
  if (count === 0) return 'var(--paper-sunk)';
  if (count <= 2) return 'var(--success-tint)';
  if (count <= 6) return '#9fd4bd';
  return 'var(--success)';
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function DayPopup({ date, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    fetch(`/api/progress/day?date=${date}`, { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load that day');
        setDetail(d);
      })
      .catch((err) => setError(err.message));
  }, [date]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30, 27, 22, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 400, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--ink-muted)' }}
        >
          ×
        </button>
        <span className="eyebrow">{formatDate(date)}</span>

        {error && <p className="muted" style={{ marginTop: 12 }}>{error}</p>}
        {!error && !detail && <p className="muted" style={{ marginTop: 12 }}>Loading…</p>}

        {detail && detail.totalQuestions === 0 && (
          <p className="muted" style={{ marginTop: 12 }}>Nothing studied on this day.</p>
        )}

        {detail && detail.totalQuestions > 0 && (
          <>
            <h3 style={{ marginTop: 10 }}>
              {detail.totalQuestions} question{detail.totalQuestions === 1 ? '' : 's'}, {detail.correctCount} correct
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
              {detail.topics.map((t, i) => (
                <div
                  key={t.topicId}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}
                >
                  <Link href={`/lesson/${t.topicId}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    {t.topicName}
                  </Link>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    {t.correct}/{t.attempts} correct
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivityCalendar() {
  const now = new Date();
  const [offset, setOffset] = useState(0); // months back from current
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const viewDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/api/progress/calendar?month=${monthKey}`, { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load the calendar');
        setData(d);
      })
      .catch((err) => setError(err.message));
  }, [monthKey]);

  if (error) return <p className="muted" style={{ fontSize: '0.85rem' }}>{error}</p>;

  const todayKey = now.toISOString().slice(0, 10);
  const firstWeekday = data ? new Date(data.year, data.month - 1, 1).getDay() : 0;
  const leadingBlanks = Array.from({ length: firstWeekday });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(o + 1, 11))}
          aria-label="Previous month"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: '1.1rem', padding: 4 }}
        >
          ‹
        </button>
        <span className="eyebrow">{MONTH_NAME[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(o - 1, 0))}
          aria-label="Next month"
          disabled={offset === 0}
          style={{ background: 'none', border: 'none', cursor: offset === 0 ? 'default' : 'pointer', color: offset === 0 ? 'var(--border)' : 'var(--ink-muted)', fontSize: '1.1rem', padding: 4 }}
        >
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 14 }}>
        {WEEKDAY.map((w, i) => (
          <div key={`${w}-${i}`} style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
            {w}
          </div>
        ))}

        {!data && Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: 'var(--paper-sunk)', opacity: 0.4 }} />
        ))}

        {data && leadingBlanks.map((_, i) => <div key={`b-${i}`} />)}

        {data && data.days.map((d) => {
          const isToday = d.date === todayKey;
          const isFuture = d.date > todayKey;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => !isFuture && setSelectedDate(d.date)}
              disabled={isFuture}
              title={`${d.date}: ${d.count} question${d.count === 1 ? '' : 's'}`}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                background: intensity(d.count),
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                color: d.count > 2 ? '#fff' : 'var(--ink-muted)',
                fontWeight: isToday ? 700 : 400,
                outline: isToday ? '2px solid var(--primary)' : 'none',
                outlineOffset: '-2px',
                cursor: isFuture ? 'default' : 'pointer',
                opacity: isFuture ? 0.4 : 1,
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              {Number(d.date.slice(-2))}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
        <span>Less</span>
        {[0, 1, 3, 7].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: intensity(c) }} />
        ))}
        <span>More</span>
      </div>

      {selectedDate && <DayPopup date={selectedDate} onClose={() => setSelectedDate(null)} />}
    </div>
  );
}
