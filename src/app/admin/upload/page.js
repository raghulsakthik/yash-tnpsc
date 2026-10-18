'use client';

import { useEffect, useRef, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';
import PdfClassifyPanel from './PdfClassifyPanel';
import VocabularyPanel from './VocabularyPanel';

const SAMPLE_YAML = `topic: aptitude.averages
language: en
source: admin-upload
questions:
  - id: averages-101
    difficulty: 0.30
    estimatedSeconds: 40
    question: "Find the average of 12, 18 and 24."
    options: ["16", "17", "18", "19"]
    answer: 2
    explanation: "Average = sum ÷ count = 54 ÷ 3 = 18."
    trap: "Forgetting to divide after adding is the most common slip."
`;

function UploadBody() {
  const [tree, setTree] = useState(null);
  const [yamlText, setYamlText] = useState(SAMPLE_YAML);
  const [mode, setMode] = useState('existing'); // existing | new
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [newTopicId, setNewTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newChapterIsNew, setNewChapterIsNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/syllabus', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => {
        setTree(d.subjects ?? []);
        if (d.subjects?.[0]) setSubjectId(d.subjects[0].id);
      })
      .catch(() => {});
  }, []);

  const subject = tree?.find((s) => s.id === subjectId);
  const chapters = subject?.chapters ?? [];
  const chapter = chapters.find((c) => c.id === chapterId);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setYamlText(text);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const body = { yaml: yamlText };
      if (mode === 'new') {
        body.newTopic = {
          topicId: newTopicId.trim(),
          topicName: newTopicName.trim(),
          chapterId: newChapterIsNew ? `${subjectId}.${slugify(newChapterName)}` : chapterId,
          ...(newChapterIsNew ? { chapterName: newChapterName.trim(), subjectId } : {}),
        };
      }
      const res = await fetch('/api/admin/content/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Upload failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <span className="eyebrow">1. Destination topic</span>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button type="button" className={`pill-tab ${mode === 'existing' ? 'active' : ''}`} onClick={() => setMode('existing')}>
            Add to an existing topic
          </button>
          <button type="button" className={`pill-tab ${mode === 'new' ? 'active' : ''}`} onClick={() => setMode('new')}>
            Create a new topic
          </button>
        </div>

        {mode === 'existing' && tree && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select label="Subject" value={subjectId} onChange={(v) => { setSubjectId(v); setChapterId(''); setTopicId(''); }} options={tree.map((s) => [s.id, s.name])} />
            <Select label="Chapter" value={chapterId} onChange={(v) => { setChapterId(v); setTopicId(''); }} options={chapters.map((c) => [c.id, c.name])} />
            <Select
              label="Topic"
              value={topicId}
              onChange={setTopicId}
              options={(chapter?.topics ?? []).map((t) => [t.id, `${t.name} (${t.questionCount} questions)`])}
            />
            {topicId && <p className="muted" style={{ fontSize: '0.82rem' }}>The YAML&apos;s <code>topic:</code> field must be exactly <strong>{topicId}</strong>.</p>}
          </div>
        )}

        {mode === 'new' && tree && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Select label="Subject" value={subjectId} onChange={(v) => { setSubjectId(v); setChapterId(''); setNewChapterIsNew(false); }} options={tree.map((s) => [s.id, s.name])} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className={`pill-tab ${!newChapterIsNew ? 'active' : ''}`} onClick={() => setNewChapterIsNew(false)}>Existing chapter</button>
              <button type="button" className={`pill-tab ${newChapterIsNew ? 'active' : ''}`} onClick={() => setNewChapterIsNew(true)}>New chapter</button>
            </div>
            {!newChapterIsNew && <Select label="Chapter" value={chapterId} onChange={setChapterId} options={chapters.map((c) => [c.id, c.name])} />}
            {newChapterIsNew && (
              <TextField label="New chapter name" value={newChapterName} onChange={setNewChapterName} placeholder="e.g. Averages and Mixtures" />
            )}
            <TextField label="New topic id" value={newTopicId} onChange={setNewTopicId} placeholder="e.g. aptitude.averages" />
            <TextField label="New topic name" value={newTopicName} onChange={setNewTopicName} placeholder="e.g. Averages" />
            <p className="muted" style={{ fontSize: '0.82rem' }}>The YAML&apos;s <code>topic:</code> field must match the new topic id exactly.</p>
          </div>
        )}
      </div>

      <div className="card">
        <span className="eyebrow">2. Questions (YAML)</span>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
          Same format as a content file: <code>topic</code>, <code>language</code>, and a <code>questions:</code> list,
          each with id/question/options/answer/explanation. Paste it, or upload a .yaml file.
        </p>
        <div style={{ marginTop: 12 }}>
          <input ref={fileInputRef} type="file" accept=".yaml,.yml,text/yaml" onChange={handleFile} />
        </div>
        <textarea
          value={yamlText}
          onChange={(e) => setYamlText(e.target.value)}
          rows={16}
          style={{
            width: '100%', marginTop: 12, fontFamily: 'monospace', fontSize: '0.85rem',
            padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)',
          }}
        />
      </div>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      {result && (
        <div className="card" style={{ background: 'var(--success-tint)' }}>
          <strong>Done.</strong> {result.inserted} new, {result.updated} updated, in topic <code>{result.topic}</code>
          {result.createdTopic ? ' (new topic created).' : '.'}
        </div>
      )}

      <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting} style={{ alignSelf: 'flex-start' }}>
        {submitting ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)', fontFamily: 'inherit' }}
      >
        <option value="">— choose —</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)', fontFamily: 'inherit' }}
      />
    </label>
  );
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminUpload() {
  const [mode, setMode] = useState('pdf'); // pdf | yaml

  return (
    <AdminGuard>
      <h1>Upload content</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Grow the question bank and study notes without an AI call every time -- or just drop in a document and
        have it read, sorted and organized automatically when that's easier than formatting YAML by hand.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button type="button" className={`pill-tab ${mode === 'pdf' ? 'active' : ''}`} onClick={() => setMode('pdf')}>
          Upload a document (AI-sorted)
        </button>
        <button type="button" className={`pill-tab ${mode === 'yaml' ? 'active' : ''}`} onClick={() => setMode('yaml')}>
          Manual YAML (free)
        </button>
        <button type="button" className={`pill-tab ${mode === 'vocabulary' ? 'active' : ''}`} onClick={() => setMode('vocabulary')}>
          English vocabulary (Dictionary API)
        </button>
      </div>

      {mode === 'yaml' ? <UploadBody /> : mode === 'vocabulary' ? <VocabularyPanel /> : <PdfClassifyPanel />}
    </AdminGuard>
  );
}
