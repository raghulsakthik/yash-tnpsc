'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../_components/AdminGuard';

function allTopics(tree) {
  return tree.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ ...t, chapterName: c.name, subjectName: s.name }))));
}

function TemplateForm({ topics, initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rows, setRows] = useState(initial?.topics?.map((t) => ({ topicId: t.topicId, targetCount: String(t.targetCount) })) ?? [{ topicId: '', targetCount: '' }]);

  function updateRow(i, patch) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.targetCount) || 0), 0);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Name
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Polity Deep Dive"
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Description (optional)
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
      </label>

      <span className="eyebrow">Topics ({total} questions total)</span>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <select
            value={row.topicId}
            onChange={(e) => updateRow(i, { topicId: e.target.value })}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <option value="">— choose a topic —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.subjectName} / {t.chapterName} / {t.name} ({t.questionCount} available)</option>
            ))}
          </select>
          <input
            type="number" min={1} value={row.targetCount} placeholder="count"
            onChange={(e) => updateRow(i, { targetCount: e.target.value })}
            style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
          />
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setRows((r) => [...r, { topicId: '', targetCount: '' }])}>
        + Add topic row
      </button>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() =>
            onSave({
              name,
              description: description || null,
              topics: rows.filter((r) => r.topicId && Number(r.targetCount) > 0).map((r) => ({ topicId: r.topicId, targetCount: Number(r.targetCount) })),
            })
          }
        >
          {saving ? 'Saving…' : 'Save template'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminTests() {
  const [tree, setTree] = useState([]);
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // null | 'new' | templateId
  const [saving, setSaving] = useState(false);

  function loadTemplates() {
    fetch('/api/admin/tests/templates', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setError('Could not load test templates'));
  }

  useEffect(() => {
    fetch('/api/admin/syllabus', { cache: 'no-store' }).then((res) => res.json()).then((d) => setTree(d.subjects ?? []));
    loadTemplates();
  }, []);

  async function saveNew(form) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tests/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create template');
      setEditingId(null);
      loadTemplates();
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
      const res = await fetch(`/api/admin/tests/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not save template');
      setEditingId(null);
      loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t) {
    await fetch(`/api/admin/tests/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !t.active }),
    });
    loadTemplates();
  }

  async function remove(id) {
    if (!confirm('Delete this test template?')) return;
    try {
      const res = await fetch(`/api/admin/tests/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete template');
      loadTemplates();
    } catch (err) {
      setError(err.message);
    }
  }

  const topics = allTopics(tree);

  return (
    <AdminGuard>
      <h1>Tests</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Test templates -- a named set of topics and per-topic question counts. A learner starting a templated
        test (via <code>/tests/weekly?template=&lt;id&gt;</code>) gets questions drawn from exactly this
        composition instead of the default aptitude+reasoning mix.
      </p>

      {error && <div className="card" style={{ marginBottom: 16, background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      <button type="button" className="btn btn-secondary" onClick={() => setEditingId('new')}>+ New test template</button>
      {editingId === 'new' && <TemplateForm topics={topics} saving={saving} onSave={saveNew} onCancel={() => setEditingId(null)} />}

      {templates === null && <p className="muted" style={{ marginTop: 16 }}>Loading…</p>}
      {templates?.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No test templates yet.</p>}

      {templates?.map((t) => (
        <div key={t.id} style={{ marginTop: 12 }}>
          {editingId === t.id ? (
            <TemplateForm topics={topics} initial={t} saving={saving} onSave={(form) => saveEdit(t.id, form)} onCancel={() => setEditingId(null)} />
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{t.name}</strong>{' '}
                  <span className="badge" style={{ background: t.active ? 'var(--success)' : 'var(--ink-muted)', color: '#fff', fontSize: '0.7rem' }}>
                    {t.active ? 'active' : 'inactive'}
                  </span>
                  {t.description && <p className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>{t.description}</p>}
                  <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem' }}>
                    {t.questionCount} questions across {t.topics.length} topics: {t.topics.map((x) => `${x.topicName} (${x.targetCount})`).join(', ')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Link href={`/tests/weekly?template=${t.id}`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Preview</Link>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => toggleActive(t)}>
                    {t.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => setEditingId(t.id)}>Edit</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--warm-accent)' }} onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </AdminGuard>
  );
}
