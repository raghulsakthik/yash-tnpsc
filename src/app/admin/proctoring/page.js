'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function SessionDetail({ testId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/admin/proctoring/sessions/${testId}`, { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load session');
        setDetail(d);
      })
      .catch((err) => setError(err.message));
  }, [testId]);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow">Session detail</span>
        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={onClose}>Close</button>
      </div>

      {error && <p style={{ color: 'var(--warm-accent)', marginTop: 10 }}>{error}</p>}
      {!detail && !error && <p className="muted" style={{ marginTop: 10 }}>Loading…</p>}

      {detail && (
        <>
          <p style={{ marginTop: 10 }}>
            <strong>{detail.learnerName}</strong> · {detail.testStatus}
            {detail.score !== null && ` · ${detail.score}%`} · {detail.questionCount} questions
          </p>
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Started {formatDate(detail.startedAt)}{detail.endedAt && ` · Ended ${formatDate(detail.endedAt)}`} · {detail.status}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <span className="eyebrow" style={{ fontSize: '0.75rem' }}>Camera</span>
              {detail.hasCamera ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video controls style={{ width: '100%', marginTop: 8, borderRadius: 8, background: '#000' }} src={`/api/admin/proctoring/media/${testId}/camera`} />
              ) : (
                <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>No camera recording.</p>
              )}
            </div>
            <div>
              <span className="eyebrow" style={{ fontSize: '0.75rem' }}>Screen</span>
              {detail.hasScreen ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video controls style={{ width: '100%', marginTop: 8, borderRadius: 8, background: '#000' }} src={`/api/admin/proctoring/media/${testId}/screen`} />
              ) : (
                <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>No screen recording.</p>
              )}
            </div>
          </div>

          <span className="eyebrow" style={{ display: 'block', marginTop: 20, fontSize: '0.75rem' }}>Event timeline ({detail.events.length})</span>
          {detail.events.length === 0 && <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>No flagged events -- a clean session.</p>}
          <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
            {detail.events.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: '0.82rem' }}>
                <span>{e.type.replace(/_/g, ' ')}</span>
                <span className="muted">{formatDate(e.at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminProctoring() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [openTestId, setOpenTestId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/proctoring/sessions', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load proctoring sessions');
        setSessions(d.sessions);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminGuard>
      <h1>Proctoring</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Camera and screen recordings captured during proctored tests, with a timeline of monitoring events
        (tab switches, fullscreen exits, a dropped camera or screen share) for each session.
      </p>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!sessions && !error && <p className="muted">Loading…</p>}
      {sessions?.length === 0 && <div className="card"><p className="muted">No proctored test sessions yet.</p></div>}

      {sessions?.map((s) => (
        <div key={s.testId} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <strong>{s.learnerName}</strong>{' '}
              <span className="badge" style={{ background: s.status === 'COMPLETED' ? 'var(--success)' : 'var(--warm-accent)', color: '#fff', fontSize: '0.7rem' }}>
                {s.status}
              </span>
              <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                {formatDate(s.startedAt)} · {s.testStatus}{s.score !== null && ` · ${s.score}%`} ·{' '}
                {s.hasCamera ? 'camera ✓' : 'no camera'} · {s.hasScreen ? 'screen ✓' : 'no screen'} ·{' '}
                {s.eventCount} event{s.eventCount === 1 ? '' : 's'}
              </p>
            </div>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setOpenTestId(s.testId)}>
              Review
            </button>
          </div>
          {openTestId === s.testId && <SessionDetail testId={s.testId} onClose={() => setOpenTestId(null)} />}
        </div>
      ))}
    </AdminGuard>
  );
}
