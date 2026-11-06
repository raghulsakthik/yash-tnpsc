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
  const [mcqPreview, setMcqPreview] = useState(null);
  const [mcqPreviewBusy, setMcqPreviewBusy] = useState(null);
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [mcqEdits, setMcqEdits] = useState({});
  const [mcqLanguage, setMcqLanguage] = useState('en');
  const [stagingMcqs, setStagingMcqs] = useState(false);

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

  async function openMcqPreview(resource) {
    setMcqPreviewBusy(resource.id); setMcqPreview(null);
    try {
      const response = await fetch('/api/admin/retrieval/resources/' + resource.id + '/mcq-preview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not extract MCQ candidates');
      const syllabusResponse = await fetch('/api/admin/syllabus', { cache: 'no-store' });
      const syllabusData = await syllabusResponse.json();
      if (!syllabusResponse.ok) throw new Error(syllabusData.message || 'Could not load syllabus topics');
      const topics = (syllabusData.subjects || []).flatMap((subject) =>
        (subject.chapters || []).flatMap((chapter) =>
          (chapter.topics || []).map((topic) => ({
            id: topic.id,
            label: subject.name + ' / ' + chapter.name + ' / ' + topic.name,
          }))
        )
      );
      setSyllabusTopics(topics);
      const sample = (data.candidates || []).map((candidate) => candidate.question + ' ' + (candidate.options || []).map((option) => option.text).join(' ')).join(' ');
      setMcqLanguage(/[\u0B80-\u0BFF]/.test(sample) ? 'ta' : 'en');
      setMcqEdits(Object.fromEntries((data.candidates || []).map((candidate, index) => [index, {
        selected: false, topicId: '', answerIndex: '', explanation: '', humanVerified: false,
      }])));
      setMcqPreview({ ...data, title: resource.title });
    } catch (err) { setMessage({ ok: false, text: err.message }); }
    finally { setMcqPreviewBusy(null); }
  }

  function updateMcqEdit(index, patch) {
    setMcqEdits((current) => ({
      ...current,
      [index]: { ...current[index], ...patch },
    }));
  }

  const selectedMcqIndexes = Object.keys(mcqEdits).filter((index) => mcqEdits[index]?.selected);
  const readyMcqIndexes = selectedMcqIndexes.filter((index) => {
    const edit = mcqEdits[index];
    return edit.topicId && edit.answerIndex !== '' && edit.explanation.trim().length >= 16 && edit.humanVerified;
  });
  const canStageMcqs = selectedMcqIndexes.length > 0 && readyMcqIndexes.length === selectedMcqIndexes.length;

  async function stageVerifiedMcqs() {
    if (!mcqPreview || !canStageMcqs || stagingMcqs) return;
    setStagingMcqs(true);
    setMessage(null);
    try {
      const mcqs = readyMcqIndexes.map((index) => {
        const candidate = mcqPreview.candidates[Number(index)];
        const edit = mcqEdits[index];
        return {
          topicId: edit.topicId,
          language: mcqLanguage,
          question: candidate.question,
          options: candidate.options.map((option) => option.text),
          answerIndex: Number(edit.answerIndex),
          explanation: edit.explanation.trim(),
          humanVerified: true,
          questionNumber: candidate.question_number,
          sourcePage: candidate.source_page,
        };
      });
      const response = await fetch('/api/admin/content/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcqs,
          examGroup: group,
          paper: mcqPreview.title,
          sourceFileName: mcqPreview.filename,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not stage the verified questions');
      setMessage({
        ok: true,
        text: result.insertedQuestions + ' question(s) staged as DRAFT across ' + result.reviewBatches + ' review batch(es). ' + result.duplicatesSkipped + ' duplicate(s) skipped. Nothing is learner-visible until separately approved.',
      });
      setMcqPreview(null);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setStagingMcqs(false);
    }
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
          <button className="btn" disabled={mcqPreviewBusy === r.id} onClick={() => openMcqPreview(r)}>{mcqPreviewBusy === r.id ? 'Reading questions…' : 'Preview MCQs'}</button>
          <button className="btn btn-primary" disabled={busy.has(r.id)} onClick={() => analyze(r)}>{busy.has(r.id) ? 'Analysing…' : 'Analyse & label'}</button>
        </div>
      </div>)}
      {!resources.length && !error && <div className="card-sunk muted">No completed non-PYQ resources found for this group.</div>}
    </div>}
    {mcqPreview && <div role="dialog" aria-modal="true" aria-labelledby="retrieval-mcq-title"
      onClick={(event) => { if (event.target === event.currentTarget) setMcqPreview(null); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,.62)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section className="card" style={{ width: 'min(1100px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 80px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div><span className="eyebrow">READ-ONLY QUESTION EXTRACTION · NOT PUBLISHED</span><h2 id="retrieval-mcq-title" style={{ marginTop: 6 }}>{mcqPreview.title}</h2></div>
          <button className="btn" onClick={() => setMcqPreview(null)} aria-label="Close MCQ preview">Close</button>
        </div>
        <div className="stat-row">
          <div className="stat"><div className="num">{mcqPreview.candidate_count}</div><div className="label">question candidates</div></div>
          <div className="stat"><div className="num">{mcqPreview.answerless_count}</div><div className="label">without printed answer marker</div></div>
          <div className="stat"><div className="num">{mcqPreview.pages_requested}</div><div className="label">pages scanned (maximum)</div></div>
          <div className="stat"><div className="num">Required</div><div className="label">human verification</div></div>
        </div>
        <p className="muted" style={{ fontSize: '.78rem' }}>These are extraction candidates, not approved questions. Printed answer markers, if present, are unverified. No rows were saved or published.</p>
        {mcqPreview.truncated && <p className="muted">Only the first 100 candidates are shown.</p>}
        <div style={{ overflow: 'auto', display: 'grid', gap: 10, paddingRight: 4 }}>
          {mcqPreview.candidates.map((candidate, index) => <article className="card-sunk" key={candidate.source_page + '-' + candidate.question_number + '-' + index} style={{ fontFamily: 'Noto Sans Tamil, Latha, Noto Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong>Q{candidate.question_number || index + 1}</strong>
              <span className="muted" style={{ fontSize: '.75rem' }}>Page {candidate.source_page} · Review required</span>
            </div>
            <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{candidate.question}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6, marginTop: 8 }}>
              {candidate.options.map((option) => <div key={option.label} className="muted" style={{ fontSize: '.84rem' }}><strong>{option.label}.</strong> {option.text}</div>)}
            </div>
            {candidate.answer_marker_present && <p className="muted" style={{ marginTop: 8, fontSize: '.78rem' }}>Printed answer marker: {candidate.answer_marker} (unverified; not imported automatically)</p>}
            <div style={{ display: 'grid', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.84rem' }}>
                <input type="checkbox" checked={Boolean(mcqEdits[index]?.selected)} onChange={(event) => updateMcqEdit(index, { selected: event.target.checked })} />
                Select this question for draft review
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: '.8rem' }}>
                Syllabus topic
                <select value={mcqEdits[index]?.topicId || ''} onChange={(event) => updateMcqEdit(index, { topicId: event.target.value })} style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--paper)', color: 'inherit', border: '1px solid var(--border)' }}>
                  <option value="">Choose the exact topic…</option>
                  {syllabusTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: '.8rem' }}>
                Verified correct answer
                <select value={mcqEdits[index]?.answerIndex ?? ''} onChange={(event) => updateMcqEdit(index, { answerIndex: event.target.value, humanVerified: false })} style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--paper)', color: 'inherit', border: '1px solid var(--border)' }}>
                  <option value="">Choose after checking the source…</option>
                  {candidate.options.map((option, optionIndex) => <option key={option.label} value={optionIndex}>{option.label} — {option.text}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: '.8rem' }}>
                Explanation (minimum 16 characters)
                <textarea value={mcqEdits[index]?.explanation || ''} onChange={(event) => updateMcqEdit(index, { explanation: event.target.value, humanVerified: false })} rows={2} placeholder="Explain why the verified answer is correct…" style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--paper)', color: 'inherit', border: '1px solid var(--border)' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.78rem' }}>
                <input type="checkbox" checked={Boolean(mcqEdits[index]?.humanVerified)} onChange={(event) => updateMcqEdit(index, { humanVerified: event.target.checked })} />
                I checked the original source, confirmed the answer and reviewed this question's options and explanation.
              </label>
            </div>
          </article>)}
          {!mcqPreview.candidates.length && <div className="card-sunk muted">No MCQ candidates were extracted from the first {mcqPreview.pages_requested} pages.</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
            Question language
            <select value={mcqLanguage} onChange={(event) => setMcqLanguage(event.target.value)} style={{ padding: 8, borderRadius: 8, background: 'var(--paper)', color: 'inherit', border: '1px solid var(--border)' }}>
              <option value="ta">Tamil</option><option value="en">English</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setMcqPreview(null)}>Close</button>
            <button className="btn btn-primary" disabled={!canStageMcqs || stagingMcqs} onClick={stageVerifiedMcqs}>{stagingMcqs ? 'Staging…' : 'Stage ' + readyMcqIndexes.length + ' verified MCQs'}</button>
          </div>
        </div>
        {selectedMcqIndexes.length > 0 && !canStageMcqs && <p className="muted" style={{ fontSize: '.75rem' }}>Complete the topic, answer, explanation and source-verification steps for every selected question before staging.</p>}
      </section>
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
