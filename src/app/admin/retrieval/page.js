'use client';
import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';
import Link from 'next/link';

function Body() {
  const [group, setGroup] = useState('GROUP_2A');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(new Set());
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/admin/retrieval/resources?group=' + group, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResources(data.resources || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [group]);

  async function openPreview(resource) {
    setPreviewBusy(resource.id); setPreview(null);
    try {
      const response = await fetch('/api/admin/retrieval/resources/' + resource.id + '/preview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not extract this document');
      setPreview({ ...data, title: resource.title });
    } catch (err) { setMessage({ ok: false, text: err.message }); }
    finally { setPreviewBusy(null); }
  }

  async function analyze(resource) {
    setBusy((current) => new Set(current).add(resource.id)); setMessage(null);
    try {
      const response = await fetch('/api/admin/retrieval/resources/' + resource.id + '/analyze', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage({ ok: true, text: resource.title + ' → label engine queued (batch ' + data.batchId + '). Review before publication.' });
    } catch (err) { setMessage({ ok: false, text: err.message }); }
    finally {
      setBusy((current) => { const next = new Set(current); next.delete(resource.id); return next; });
    }
  }

  const extraction = preview && preview.extraction;
  const classification = preview && preview.classification;
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div><span className="eyebrow">RETRIEVAL → LABEL ENGINE → PLATFORM</span><h1 style={{ marginTop: 8 }}>TNPSC Source Library</h1>
        <p className="muted" style={{ marginTop: 8 }}>Inspect extracted source text, analyse it against the syllabus, and stage it for human review before it reaches learners.</p></div>
      <Link href="/admin/review" className="btn btn-primary" style={{ textDecoration: 'none' }}>Review queue →</Link>
    </div>
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className={'btn ' + (group === 'GROUP_2' ? 'btn-primary' : '')} onClick={() => setGroup('GROUP_2')}>Group 2</button>
        <button className={'btn ' + (group === 'GROUP_2A' ? 'btn-primary' : '')} onClick={() => setGroup('GROUP_2A')}>Group 2A</button>
      </div>
      <div className="stat-row" style={{ marginTop: 14 }}>
        <div className="stat"><div className="num">{resources.length}</div><div className="label">retrieved non-PYQ sources</div></div>
        <div className="stat"><div className="num">{resources.filter((r) => r.status === 'complete').length}</div><div className="label">ready for analysis</div></div>
      </div>
    </div>
    {message && <div className="card" style={{ marginBottom: 16, background: message.ok ? 'var(--success-tint)' : 'var(--warm-tint)' }}>{message.text}</div>}
    {error && <div className="card" style={{ background: 'var(--warm-tint)' }}>{error}</div>}
    {loading ? <p className="muted">Loading retrieval library…</p> : <div style={{ display: 'grid', gap: 10 }}>
      {resources.map((r) => <div className="card-sunk" key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}><strong>{r.title}</strong>
          <p className="muted" style={{ fontSize: '.78rem', marginTop: 5 }}>{r.resource_type} · {r.group_name} · {r.status}</p>
          <p className="muted" style={{ fontSize: '.7rem', marginTop: 4, overflowWrap: 'anywhere' }}>SHA-256 {r.sha256 || 'pending'}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" disabled={previewBusy === r.id} onClick={() => openPreview(r)}>{previewBusy === r.id ? 'Extracting…' : 'Preview text'}</button>
          <button className="btn btn-primary" disabled={busy.has(r.id)} onClick={() => analyze(r)}>{busy.has(r.id) ? 'Analysing…' : 'Analyse & label'}</button>
        </div>
      </div>)}
      {!resources.length && !error && <div className="card-sunk muted">No completed non-PYQ resources found for this group.</div>}
    </div>}
    {preview && <div role="dialog" aria-modal="true" aria-labelledby="retrieval-preview-title"
      onClick={(event) => { if (event.target === event.currentTarget) setPreview(null); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.62)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section className="card" style={{ width: 'min(1100px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 80px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div><span className="eyebrow">HUMAN EXTRACTION REVIEW · NOT PUBLISHED</span><h2 id="retrieval-preview-title" style={{ marginTop: 6 }}>{preview.title}</h2></div>
          <button className="btn" onClick={() => setPreview(null)} aria-label="Close preview">Close</button>
        </div>
        <div className="stat-row">
          <div className="stat"><div className="num">{extraction?.method || '—'}</div><div className="label">extraction method</div></div>
          <div className="stat"><div className="num">{extraction?.pages_examined ?? '—'} / {extraction?.page_count ?? '—'}</div><div className="label">pages examined / total</div></div>
          <div className="stat"><div className="num">{(extraction?.text_characters || 0).toLocaleString()}</div><div className="label">extracted characters</div></div>
          <div className="stat"><div className="num">{classification?.review_required ? 'Required' : 'No'}</div><div className="label">human review</div></div>
        </div>
        {extraction?.warnings?.length > 0 && <div className="card-sunk"><strong>Extraction warnings</strong><p style={{ marginTop: 5 }}>{extraction.warnings.join(' · ')}</p></div>}
        {classification && <details className="card-sunk"><summary style={{ cursor: 'pointer' }}>Detected classification details</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 8 }}>{JSON.stringify(classification, null, 2)}</pre></details>}
        {extraction?.preview_truncated && <p className="muted">Preview is capped at 50,000 characters. The source document has not been fully ingested.</p>}
        <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, borderRadius: 10, background: 'var(--surface-sunken, rgba(127,127,127,.10))', fontFamily: 'Noto Sans Tamil, Latha, Noto Sans, sans-serif', fontSize: '.88rem', lineHeight: 1.65, minHeight: 220 }}>{extraction?.preview || 'No text could be extracted.'}</pre>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p className="muted" style={{ fontSize: '.78rem' }}>Compare this text with the original PDF. OCR may contain mistakes; this preview does not approve or publish content.</p>
          <button className="btn btn-primary" onClick={() => setPreview(null)}>Done reviewing</button>
        </div>
      </section>
    </div>}
  </>;
}
export default function RetrievalAdmin() { return <AdminGuard><Body /></AdminGuard>; }
