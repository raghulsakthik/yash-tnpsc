'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function InlineField({ value, onChange, placeholder, width }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', width: width ?? 180 }}
    />
  );
}

function SmallButton({ children, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px', borderRadius: 7, fontSize: '0.78rem', border: '1px solid var(--border)',
        background: danger ? 'var(--warm-tint)' : '#fff', color: danger ? 'var(--warm-accent)' : 'var(--ink)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function AdminSubjects() {
  const [tree, setTree] = useState(null);
  const [error, setError] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newChapterByBjSubject, setNewChapterBySubject] = useState({}); // subjectId -> {name, questionCount}
  const [newTopicByChapter, setNewTopicByChapter] = useState({}); // chapterId -> name
  const [expanded, setExpanded] = useState({});

  function load() {
    fetch('/api/admin/syllabus', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setTree(d.subjects ?? []))
      .catch(() => setError('Could not load subjects'));
  }

  useEffect(load, []);

  async function withErrorHandling(fn) {
    try {
      await fn();
      setError(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addSubject() {
    if (!newSubjectName.trim()) return;
    await withErrorHandling(async () => {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slugify(newSubjectName), name: newSubjectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create subject');
      setNewSubjectName('');
    });
  }

  async function deleteSubject(id, name) {
    if (!confirm(`Delete subject "${name}" and everything under it (chapters, topics, questions)? This cannot be undone.`)) return;
    await withErrorHandling(async () => {
      const res = await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete subject');
    });
  }

  async function addChapter(subjectId) {
    const draft = newChapterByBjSubject[subjectId];
    if (!draft?.name?.trim()) return;
    await withErrorHandling(async () => {
      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `${subjectId}.${slugify(draft.name)}`, subjectId, name: draft.name.trim(), questionCount: Number(draft.questionCount) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create chapter');
      setNewChapterBySubject((s) => ({ ...s, [subjectId]: { name: '', questionCount: '' } }));
    });
  }

  async function deleteChapter(id, name) {
    if (!confirm(`Delete chapter "${name}" and everything under it (topics, questions)? This cannot be undone.`)) return;
    await withErrorHandling(async () => {
      const res = await fetch(`/api/admin/chapters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete chapter');
    });
  }

  async function addTopic(chapterId) {
    const name = newTopicByChapter[chapterId];
    if (!name?.trim()) return;
    await withErrorHandling(async () => {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `${chapterId.split('.')[0]}.${slugify(name)}`, chapterId, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create topic');
      setNewTopicByChapter((s) => ({ ...s, [chapterId]: '' }));
    });
  }

  async function deleteTopic(id, name) {
    if (!confirm(`Delete topic "${name}" and all its questions? This cannot be undone.`)) return;
    await withErrorHandling(async () => {
      const res = await fetch(`/api/admin/topics/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not delete topic');
    });
  }

  if (error && !tree) {
    return (
      <AdminGuard>
        <h1>Subjects &amp; Topics</h1>
        <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}><p>{error}</p></div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <h1>Subjects &amp; Topics</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        The full syllabus tree. Deleting a subject or chapter cascades to everything under it -- topics, lessons, questions.
      </p>

      {error && <div className="card" style={{ marginBottom: 16, background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <span className="eyebrow">New subject</span>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <InlineField value={newSubjectName} onChange={setNewSubjectName} placeholder="e.g. Science and Technology" width={280} />
          <SmallButton onClick={addSubject}>+ Add subject</SmallButton>
        </div>
      </div>

      {!tree && <p className="muted">Loading…</p>}

      {tree?.map((subject) => (
        <div key={subject.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [subject.id]: !e[subject.id] }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              <strong style={{ fontSize: '1.05rem' }}>{expanded[subject.id] ? '▾' : '▸'} {subject.name}</strong>
              <span className="muted" style={{ marginLeft: 10, fontSize: '0.8rem' }}>{subject.id} · {subject.chapters.length} chapters</span>
            </button>
            <SmallButton danger onClick={() => deleteSubject(subject.id, subject.name)}>Delete</SmallButton>
          </div>

          {expanded[subject.id] && (
            <div style={{ marginTop: 16, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
              {subject.chapters.map((chapter) => (
                <div key={chapter.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [chapter.id]: !e[chapter.id] }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                    >
                      <span style={{ fontWeight: 600 }}>{expanded[chapter.id] ? '▾' : '▸'} {chapter.name}</span>
                      <span className="muted" style={{ marginLeft: 10, fontSize: '0.78rem' }}>{chapter.id} · {chapter.topics.length} topics</span>
                    </button>
                    <SmallButton danger onClick={() => deleteChapter(chapter.id, chapter.name)}>Delete</SmallButton>
                  </div>

                  {expanded[chapter.id] && (
                    <div style={{ marginTop: 10, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                      {chapter.topics.map((topic) => (
                        <div key={topic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                          <span style={{ fontSize: '0.88rem' }}>
                            {topic.name} <span className="muted">({topic.questionCount} questions)</span>
                          </span>
                          <SmallButton danger onClick={() => deleteTopic(topic.id, topic.name)}>Delete</SmallButton>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <InlineField
                          value={newTopicByChapter[chapter.id] ?? ''}
                          onChange={(v) => setNewTopicByChapter((s) => ({ ...s, [chapter.id]: v }))}
                          placeholder="New topic name"
                        />
                        <SmallButton onClick={() => addTopic(chapter.id)}>+ Add topic</SmallButton>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <InlineField
                  value={newChapterByBjSubject[subject.id]?.name ?? ''}
                  onChange={(v) => setNewChapterBySubject((s) => ({ ...s, [subject.id]: { ...s[subject.id], name: v } }))}
                  placeholder="New chapter name"
                />
                <InlineField
                  value={newChapterByBjSubject[subject.id]?.questionCount ?? ''}
                  onChange={(v) => setNewChapterBySubject((s) => ({ ...s, [subject.id]: { ...s[subject.id], questionCount: v } }))}
                  placeholder="Exam question count"
                  width={140}
                />
                <SmallButton onClick={() => addChapter(subject.id)}>+ Add chapter</SmallButton>
              </div>
            </div>
          )}
        </div>
      ))}
    </AdminGuard>
  );
}
