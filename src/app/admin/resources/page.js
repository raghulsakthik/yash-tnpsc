'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminResources() {
  const [resources, setResources] = useState(null);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/admin/resources', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setError('Could not load resources'));
  }

  useEffect(load, []);

  async function upload(e) {
    e.preventDefault();
    if (!file) { setError('Choose a file first.'); return; }
    setSaving(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, fileName: file.name, mimeType: file.type, fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Upload failed'); return; }
      setTitle(''); setDescription(''); setCategory('General'); setFile(null);
      load();
    } catch {
      setError('Upload failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 18px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Learner Resources</h1>
        <p style={{ color: '#78716c', fontSize: 13, marginBottom: 24 }}>
          Real files uploaded here appear as downloads on the learner Resources page — nothing is fabricated client-side.
        </p>

        <form onSubmit={upload} style={{ display: 'grid', gap: 12, marginBottom: 32, padding: 20, border: '1px solid #eadfd7', borderRadius: 14 }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
          <input placeholder="Category (e.g. Syllabus, Cheat Sheet)" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          {error && <div style={{ color: '#b42318', fontSize: 12 }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ height: 42, borderRadius: 10, border: 0, background: '#ea580c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Uploading…' : 'Upload resource'}
          </button>
        </form>

        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Uploaded resources</h2>
        {!resources && !error && <p>Loading…</p>}
        {resources?.length === 0 && <p style={{ color: '#78716c', fontSize: 13 }}>No resources uploaded yet.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {resources?.map((r) => (
            <div key={r.id} style={{ border: '1px solid #eadfd7', borderRadius: 10, padding: 12, fontSize: 13 }}>
              <strong>{r.title}</strong> — {r.category} · {(r.size_bytes / 1024 / 1024).toFixed(2)} MB
              {r.description && <div style={{ color: '#78716c', marginTop: 4 }}>{r.description}</div>}
            </div>
          ))}
        </div>
      </main>
    </AdminGuard>
  );
}

const inputStyle = { height: 40, borderRadius: 8, border: '1px solid #e5e0d6', padding: '0 12px', fontSize: 13 };
