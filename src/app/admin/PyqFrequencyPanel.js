'use client';

import { useEffect, useState } from 'react';

/**
 * Turns the real 2011-2025 PYQ archive into a prioritization signal:
 * which topics the exam actually asks about most, versus how much
 * content the bank currently has for them. A topic with many PYQs and
 * few published questions is exactly what the template/AI generators
 * (Bulk Upload > Math templates) should target next.
 */
export default function PyqFrequencyPanel() {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/admin/content/pyq-frequency', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load PYQ frequency');
        setTopics(d.topics);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>;
  if (!topics) return <p className="muted">Loading…</p>;
  if (topics.length === 0) return null;

  const maxPyqs = Math.max(1, ...topics.map((t) => t.totalPyqs));
  const topGaps = [...topics].sort((a, b) => b.contentGapScore - a.contentGapScore).slice(0, 5);

  return (
    <div className="card">
      <span className="eyebrow">PYQ topic frequency (2011–2025)</span>
      <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
        How often each topic has actually been examined, from the real previous-year archive -- not a guess.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {topics.slice(0, 10).map((t) => (
          <div key={t.topicId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 160, fontSize: '0.8rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topicName}</span>
            <div style={{ flex: 1, background: 'var(--paper-sunk)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${(t.totalPyqs / maxPyqs) * 100}%`, background: 'var(--primary)', height: 10, borderRadius: 6 }} />
            </div>
            <span className="num" style={{ fontSize: '0.78rem', width: 24, textAlign: 'right' }}>{t.totalPyqs}</span>
          </div>
        ))}
      </div>

      {topGaps.some((t) => t.contentGapScore > 1) && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Highest content gap</span>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
            Frequently examined, thinly covered -- generate here first.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {topGaps.filter((t) => t.contentGapScore > 1).map((t) => (
              <div key={t.topicId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span>{t.topicName}</span>
                <span className="muted">{t.totalPyqs} PYQs · {t.publishedQuestions} published</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
