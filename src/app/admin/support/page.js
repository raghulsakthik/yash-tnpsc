'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const REASON_LABELS = {
  wrong_answer: 'Wrong answer',
  wrong_explanation: 'Wrong explanation',
  unclear: 'Unclear question',
  multiple_correct: 'Multiple correct answers',
  no_correct_answer: 'No correct answer',
  outdated: 'Outdated',
  typo: 'Typo',
  wrong_topic: 'Wrong topic',
  duplicate: 'Duplicate',
  other: 'Other',
};

function ReportCard({ report, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [editAnswerIndex, setEditAnswerIndex] = useState(report.answerIndex);
  const [editExplanation, setEditExplanation] = useState(report.explanation);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(dismiss) {
    if (!resolution.trim()) {
      alert('A short resolution note is required.');
      return;
    }
    setBusy(true);
    try {
      const correction =
        !dismiss && (editAnswerIndex !== report.answerIndex || editExplanation !== report.explanation)
          ? { answerIndex: editAnswerIndex, explanation: editExplanation }
          : undefined;
      const res = await fetch(`/api/admin/content/support/${report.questionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, dismiss, correction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not resolve');
      onResolved(report.questionId);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderLeft: report.highPriority ? '3px solid var(--warm-accent)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <span className="eyebrow">{report.topicName}</span>
          {report.highPriority && (
            <span className="badge" style={{ marginLeft: 8, background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
              High priority
            </span>
          )}
          <p style={{ marginTop: 8, fontWeight: 600 }}>{report.prompt}</p>
          <p className="muted" style={{ marginTop: 6, fontSize: '0.82rem' }}>
            {report.reportCount} report{report.reportCount === 1 ? '' : 's'} ({report.reasons.map((r) => REASON_LABELS[r] ?? r).join(', ')})
            {report.attempts > 0 && ` · ${report.attempts} real attempts, ${report.accuracy}% accuracy`}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Review'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.options.map((o, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                <input type="radio" checked={editAnswerIndex === i} onChange={() => setEditAnswerIndex(i)} />
                <strong>{LETTERS[i] ?? i + 1}.</strong> {o}
              </label>
            ))}
          </div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Explanation
            <textarea
              rows={3}
              value={editExplanation}
              onChange={(e) => setEditExplanation(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Resolution note (required)
            <input
              type="text"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="e.g. Corrected answer from C to B, per the official answer key."
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn" disabled={busy} onClick={() => submit(true)}>
              Dismiss (not actually wrong)
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submit(false)}>
              {busy ? 'Saving…' : 'Apply correction & resolve'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportCenter() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    fetch('/api/admin/content/support', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load the support queue');
        setReports(d.reports);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function handleResolved(questionId) {
    setReports((prev) => prev.filter((r) => r.questionId !== questionId));
  }

  const highPriorityCount = reports?.filter((r) => r.highPriority).length ?? 0;

  return (
    <AdminGuard>
      <h1>Question Support Center</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Every learner-reported question, grouped by question. Report count alone isn't the whole picture --
        real attempt accuracy is shown alongside it, so a question many people are genuinely failing stands
        out from one that just got a few wording nitpicks.
      </p>

      {reports && reports.length > 0 && (
        <p className="muted" style={{ marginBottom: 16 }}>
          {reports.length} question{reports.length === 1 ? '' : 's'} pending
          {highPriorityCount > 0 && ` · ${highPriorityCount} high priority`}
        </p>
      )}

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}
      {!reports && !error && <p className="muted">Loading…</p>}
      {reports?.length === 0 && <div className="card"><p className="muted">No open reports right now.</p></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {reports?.map((r) => <ReportCard key={r.questionId} report={r} onResolved={handleResolved} />)}
      </div>
    </AdminGuard>
  );
}
