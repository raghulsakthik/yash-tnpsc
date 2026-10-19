'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

function allTopics(tree) {
  return tree.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ ...t, chapterName: c.name, subjectName: s.name }))));
}

const EMPTY_FORM = { prompt: '', optionsText: '', answerIndex: 0, explanation: '', trap: '', difficulty: 0.3, estimatedSeconds: 45 };

function QuestionForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Question
        <textarea rows={2} value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Options (one per line)
        <textarea rows={4} value={form.optionsText} onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }} />
      </label>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Correct option (0-based index)
        <input type="number" min={0} value={form.answerIndex} onChange={(e) => setForm((f) => ({ ...f, answerIndex: Number(e.target.value) }))}
          style={{ display: 'block', width: 100, marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Explanation
        <textarea rows={2} value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Trap (optional)
        <input type="text" value={form.trap ?? ''} onChange={(e) => setForm((f) => ({ ...f, trap: e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>
      <div style={{ display: 'flex', gap: 16 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Difficulty (0-1)
          <input type="number" step="0.05" min={0} max={1} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
            style={{ display: 'block', width: 100, marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Estimated seconds
          <input type="number" min={5} value={form.estimatedSeconds} onChange={(e) => setForm((f) => ({ ...f, estimatedSeconds: Number(e.target.value) }))}
            style={{ display: 'block', width: 100, marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onSave(form)}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminQuestions() {
  const [tree, setTree] = useState([]);
  const [topicId, setTopicId] = useState('');
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // null | 'new' | questionId
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/syllabus', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setTree(d.subjects ?? []))
      .catch(() => setError('Could not load topics'));
  }, []);

  function loadQuestions(t) {
    if (!t) return;
    fetch(`/api/admin/questions?topic=${encodeURIComponent(t)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setError('Could not load questions'));
  }

  useEffect(() => {
    setEditingId(null);
    loadQuestions(topicId);
  }, [topicId]);

  function toForm(q) {
    return {
      prompt: q.prompt,
      optionsText: q.options.join('\n'),
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      trap: q.trap ?? '',
      difficulty: q.difficulty,
      estimatedSeconds: q.estimatedSeconds,
    };
  }

  async function saveNew(form) {
    setSaving(true);
    setError(null);
    try {
      const options = form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, prompt: form.prompt, options, answerIndex: form.answerIndex, explanation: form.explanation, trap: form.trap || null, difficulty: form.difficulty, estimatedSeconds: form.estimatedSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create question');
      setEditingId(null);
      loadQuestions(topicId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id, form) {
    setSaving(true);
    setError(null);
    try {
      const options = form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: form.prompt, options, answerIndex: form.answerIndex, explanation: form.explanation, trap: form.trap || null, difficulty: form.difficulty, estimatedSeconds: form.estimatedSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not save question');
      setEditingId(null);
      loadQuestions(topicId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this question permanently?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete question');
      loadQuestions(topicId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminGuard>
      <h1>Questions</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>Browse, edit and delete individual questions per topic.</p>

      {error && <div className="card" style={{ marginBottom: 16, background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      <div className="card">
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Topic
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            style={{ display: 'block', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', minWidth: 320 }}
          >
            <option value="">— choose a topic —</option>
            {allTopics(tree).map((t) => (
              <option key={t.id} value={t.id}>{t.subjectName} / {t.chapterName} / {t.name} ({t.questionCount})</option>
            ))}
          </select>
        </label>
      </div>

      {topicId && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setEditingId('new')}>+ New question</button>
          {editingId === 'new' && (
            <QuestionForm initial={EMPTY_FORM} saving={saving} onSave={saveNew} onCancel={() => setEditingId(null)} />
          )}

          {questions === null && <p className="muted" style={{ marginTop: 16 }}>Loading…</p>}
          {questions?.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No questions in this topic yet.</p>}

          {questions?.map((q) => (
            <div key={q.id} style={{ marginTop: 12 }}>
              {editingId === q.id ? (
                <QuestionForm initial={toForm(q)} saving={saving} onSave={(form) => saveEdit(q.id, form)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{q.prompt}</strong>
                      <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: '0.85rem' }}>
                        {q.options.map((o, i) => (
                          <li key={i} style={{ fontWeight: i === q.answerIndex ? 700 : 400, color: i === q.answerIndex ? 'var(--success)' : 'inherit' }}>{o}</li>
                        ))}
                      </ul>
                      <span className="muted" style={{ fontSize: '0.76rem' }}>
                        {q.id} · {q.status} · difficulty {q.difficulty} · {q.source}{q.hasImage ? ' · has diagram' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setEditingId(q.id)}>Edit</button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--warm-accent)' }} onClick={() => remove(q.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  );
}
