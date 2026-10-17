'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

const EMPTY_FORM = { title: '', concept: '', exampleProblem: '', exampleStepsText: '', exampleAnswer: '', tip: '' };

export default function AdminLessons() {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all'); // all | missing | has

  function load() {
    fetch('/api/admin/lessons', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setTopics(d.topics ?? []))
      .catch(() => setError('Could not load topics'));
  }

  useEffect(load, []);

  function selectTopic(topicId, hasLesson) {
    setSelected(topicId);
    setError(null);
    if (!hasLesson) {
      setForm(EMPTY_FORM);
      return;
    }
    fetch(`/api/admin/lessons/${topicId}`)
      .then((res) => res.json())
      .then((d) => setForm({ ...d, exampleStepsText: d.exampleSteps.join('\n') }))
      .catch(() => setError('Could not load lesson'));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lessons/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          concept: form.concept,
          exampleProblem: form.exampleProblem,
          exampleSteps: form.exampleStepsText.split('\n').map((s) => s.trim()).filter(Boolean),
          exampleAnswer: form.exampleAnswer,
          tip: form.tip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not save lesson');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this lesson? The topic will have no lesson until one is written again.')) return;
    try {
      const res = await fetch(`/api/admin/lessons/${selected}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete lesson');
      setSelected(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const visible = (topics ?? []).filter((t) => (filter === 'all' ? true : filter === 'has' ? t.hasLesson : !t.hasLesson));

  return (
    <AdminGuard>
      <h1>Lessons</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        The concept explanation and worked example shown on each topic&apos;s lesson page.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div className="card" style={{ maxHeight: 640, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['all', 'has', 'missing'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`pill-tab ${filter === f ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                {f === 'all' ? 'All' : f === 'has' ? 'Has lesson' : 'Missing'}
              </button>
            ))}
          </div>
          {!topics && <p className="muted">Loading…</p>}
          {topics && visible.map((t) => (
            <button
              key={t.topicId}
              type="button"
              onClick={() => selectTopic(t.topicId, t.hasLesson)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', background: selected === t.topicId ? 'var(--primary-tint)' : 'transparent',
                cursor: 'pointer', marginBottom: 2,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.topicName}</div>
              <div className="muted" style={{ fontSize: '0.74rem' }}>
                {t.chapterName} {t.hasLesson ? '· has lesson' : '· no lesson'}
              </div>
            </button>
          ))}
        </div>

        <div>
          {!selected && <div className="card"><p className="muted">Pick a topic to view or write its lesson.</p></div>}

          {selected && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="eyebrow">{selected}</span>
              {error && <p style={{ color: 'var(--warm-accent)' }}>{error}</p>}

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Title
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Concept
                <textarea rows={4} value={form.concept} onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Worked example -- problem
                <input type="text" value={form.exampleProblem} onChange={(e) => setForm((f) => ({ ...f, exampleProblem: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Worked example -- steps (one per line)
                <textarea rows={4} value={form.exampleStepsText} onChange={(e) => setForm((f) => ({ ...f, exampleStepsText: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Worked example -- answer
                <input type="text" value={form.exampleAnswer} onChange={(e) => setForm((f) => ({ ...f, exampleAnswer: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Common mistake / tip
                <textarea rows={2} value={form.tip} onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save lesson'}</button>
                <button type="button" className="btn btn-secondary" onClick={remove}>Delete lesson</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
