'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function BatchCard({ batch, onDecide }) {
  const [deciding, setDeciding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [verified, setVerified] = useState(false);
  const requiresHumanVerification = batch.generationSource === 'ai' || batch.questions.some((q) => q.generation_source === 'ai');

  async function decide(decision) {
    setDeciding(true);
    try {
      const res = await fetch(`/api/admin/content/review/${batch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, humanVerified: verified }),
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
            {batch.questions.length} questions · {(batch.lessons ?? []).length} lessons · {(batch.resources ?? []).length} study notes · {batch.generationSource}
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
          <button type="button" className="btn btn-primary" disabled={deciding || (requiresHumanVerification && (!expanded || !verified))} onClick={() => decide('approve')}>
            Approve all
          </button>
        </div>
      </div>

      {requiresHumanVerification && (
        <label className="card-sunk" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, fontSize: '0.84rem' }}>
          <input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} disabled={!expanded} />
          <span>I independently checked every AI-suggested answer against its cited source evidence and reviewed the lesson. I understand AI answers are suggestions, not verified answer keys.</span>
        </label>
      )}

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {batch.questions.map((q) => (
            <div key={q.id} className="card-sunk">
              <p style={{ fontWeight: 600 }}>{q.prompt}</p>
              {(q.source_year || q.paper || q.question_number || q.source_page) && (
                <p className="muted" style={{ marginTop: 6, fontSize: '0.75rem' }}>
                  PYQ provenance: {q.exam_code || 'TNPSC'} · {q.exam_group || 'Exam'} · {q.source_year || '—'} · {q.paper || q.source || '—'} · Q{q.question_number || '—'} · page {q.source_page || '—'}
                </p>
              )}
              {q.generation_source === 'ai' && (
                <p style={{ marginTop: 8, color: 'var(--warm-accent)', fontSize: '0.8rem', fontWeight: 700 }}>
                  AI-suggested answer — independently verify against the source evidence below.
                </p>
              )}
              <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '0.85rem' }}>
                {q.options.map((o, i) => (
                  <li key={i} style={{ fontWeight: q.generation_source === 'ai' ? 400 : (i === q.answer_index ? 700 : 400), color: q.generation_source === 'ai' ? 'inherit' : (i === q.answer_index ? 'var(--success)' : 'inherit') }}>
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
          {(batch.lessons ?? []).map((lesson) => (
            <div key={lesson.id} className="card-sunk">
              <p style={{ fontWeight: 700 }}>{lesson.title}</p>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{lesson.concept}</p>
              {lesson.definition && <p style={{ marginTop: 8, fontSize: '0.84rem' }}><strong>Definition:</strong> {lesson.definition}</p>}
              {lesson.explanation && <p style={{ marginTop: 8, fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{lesson.explanation}</p>}
              {(lesson.examples ?? []).map((example, index) => (
                <div key={index} style={{ marginTop: 10 }}>
                  <p style={{ fontWeight: 600 }}>Worked example: {example.problem}</p>
                  <ol style={{ paddingLeft: 20, marginTop: 5, fontSize: '0.84rem' }}>
                    {(example.steps ?? []).map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}
                  </ol>
                  <p style={{ fontSize: '0.84rem' }}><strong>Answer:</strong> {example.answer}</p>
                </div>
              ))}
              {(lesson.revision_notes ?? []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong style={{ fontSize: '0.82rem' }}>Revision notes</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 4, fontSize: '0.82rem' }}>
                    {lesson.revision_notes.map((note, index) => <li key={index}>{note}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <strong style={{ fontSize: '0.82rem' }}>Source evidence</strong>
                {(lesson.sourceEvidence ?? []).map((source) => (
                  <div key={source.id} style={{ marginTop: 6, padding: 10, borderRadius: 8, background: 'var(--paper)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{source.title} · {source.source}</p>
                    <p className="muted" style={{ marginTop: 4, fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>{String(source.body ?? '').slice(0, 1200)}</p>
                    <p className="muted" style={{ marginTop: 4, fontSize: '0.7rem' }}>Resource ID: {source.id}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(batch.resources ?? []).map((r) => (
            <div key={r.id} className="card-sunk">
              <p style={{ fontWeight: 600 }}>Study material: {r.title}</p>
              <p className="muted" style={{ marginTop: 8, fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>
                {r.body}
              </p>
              <p className="muted" style={{ marginTop: 6, fontSize: '0.75rem' }}>
                Source: {r.source} · status: {r.status}
              </p>
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
