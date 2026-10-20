'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function BatchCard({ batch, onDecide }) {
  const [deciding, setDeciding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function decide(decision) {
    setDeciding(true);
    try {
      const res = await fetch(`/api/admin/content/review/${batch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Decision failed');
      onDecide(batch.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <span className="eyebrow">{batch.topicName}</span>
          <p style={{ marginTop: 6, fontWeight: 600 }}>
            {batch.questions.length} questions · {batch.generationSource}
            {batch.avgQualityScore != null ? ` · quality ${Math.round(batch.avgQualityScore * 100)}%` : ''}
          </p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
            Generated {new Date(batch.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide' : 'Preview'}
          </button>
          <button type="button" className="btn" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }} disabled={deciding} onClick={() => decide('reject')}>
            Reject all
          </button>
          <button type="button" className="btn btn-primary" disabled={deciding} onClick={() => decide('approve')}>
            Approve all
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {batch.questions.map((q) => (
            <div key={q.id} className="card-sunk">
              <p style={{ fontWeight: 600 }}>{q.prompt}</p>
              <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '0.85rem' }}>
                {q.options.map((o, i) => (
                  <li key={i} style={{ fontWeight: i === q.answer_index ? 700 : 400, color: i === q.answer_index ? 'var(--success)' : 'inherit' }}>
                    {LETTERS[i] ?? i + 1}. {o}
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>{q.explanation}</p>
              {q.common_mistake && (
                <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--warm-accent)' }}>
                  Common mistake: {q.common_mistake}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewQueue() {
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    fetch('/api/admin/content/review', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load the review queue');
        setBatches(d.batches);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function handleDecided(batchId) {
    setBatches((prev) => prev.filter((b) => b.id !== batchId));
  }

  return (
    <AdminGuard>
      <h1>Review queue</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Every generated batch -- template or AI -- lands here as DRAFT first. Approving publishes every question
        in the batch at once; rejecting archives them. Nothing reaches a learner before this step.
      </p>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!batches && !error && <p className="muted">Loading…</p>}
      {batches?.length === 0 && <div className="card"><p className="muted">Nothing pending review right now.</p></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {batches?.map((b) => <BatchCard key={b.id} batch={b} onDecide={handleDecided} />)}
      </div>
    </AdminGuard>
  );
}
