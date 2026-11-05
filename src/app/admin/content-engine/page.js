'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../_components/AdminGuard';

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="num">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function normalizePackage(value) {
  const source = value?.publication ? value.publication : value;
  const publicationId = source?.publicationId ?? source?.publication_id;
  const manifestHash = source?.manifestHash ?? source?.manifest_hash;
  const items = Array.isArray(source?.items) ? source.items : [];
  if (!publicationId || !manifestHash || !items.length) {
    throw new Error('Package must contain publicationId, manifestHash and at least one item.');
  }
  return { publicationId: String(publicationId), manifestHash: String(manifestHash), items };
}

function PublicationRow({ publication }) {
  return (
    <div className="card-sunk" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{publication.publication_id}</p>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: 5 }}>
          {publication.item_count} engine items · {publication.topic_count} topics · {new Date(publication.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
        <p className="muted" style={{ fontSize: '0.72rem', marginTop: 4, overflowWrap: 'anywhere' }}>
          manifest {publication.manifest_hash}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span className="eyebrow">{publication.status}</span>
        <span className="eyebrow">{publication.imported_items} imported</span>
        <span className="eyebrow">{publication.published_items} published</span>
        {publication.rejected_items > 0 && <span className="eyebrow">{publication.rejected_items} rejected</span>}
      </div>
    </div>
  );
}

function ContentEngineBody() {
  const [packageText, setPackageText] = useState('');
  const [packageData, setPackageData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [publications, setPublications] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [generationTopics, setGenerationTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [mcqCount, setMcqCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState(null);
  const [generationQuality, setGenerationQuality] = useState(null);

  async function loadGenerationTopics() {
    try {
      const res = await fetch('/api/admin/content-engine/generate', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not load generation topics');
      setGenerationTopics(data.topics ?? []);
    } catch (error) {
      setGenerationMessage({ type: 'error', text: error.message });
    }
  }

  async function generateTopicContent() {
    if (!selectedTopicId) return;
    setGenerating(true);
    setGenerationMessage(null);
    setGenerationQuality(null);
    try {
      const res = await fetch('/api/admin/content-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopicId, mcqCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Generation failed');
      setGenerationQuality(data.quality);
      const text = JSON.stringify(data.package, null, 2);
      setPackageText(text);
      setPackageData(normalizePackage(data.package));
      setFileName('AI-generated topic package');
      setGenerationMessage({ type: 'success', text: 'Generated content passed structural and source-evidence checks. Review the quality details, then import it into the human review queue.' });
    } catch (error) {
      setGenerationMessage({ type: 'error', text: error.message });
    } finally {
      setGenerating(false);
    }
  }

  async function loadPublications() {
    try {
      const res = await fetch('/api/admin/content-engine/publications', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not load publications');
      setPublications(data.publications ?? []);
    } catch (error) {
      setLoadError(error.message);
    }
  }

  useEffect(() => { loadPublications(); loadGenerationTopics(); }, []);

  function parsePackage(text) {
    setMessage(null);
    setPackageText(text);
    if (!text.trim()) {
      setPackageData(null);
      return;
    }
    try {
      setPackageData(normalizePackage(JSON.parse(text)));
    } catch (error) {
      setPackageData(null);
      setMessage({ type: 'error', text: error.message });
    }
  }

  async function importPackage() {
    if (!packageData) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content-engine/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Import failed');
      setMessage({ type: 'success', text: `Imported ${data.importedItems} items. Review batch(es): ${data.reviewBatchIds.join(', ')}` });
      setPackageText('');
      setPackageData(null);
      setFileName('');
      await loadPublications();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setImporting(false);
    }
  }

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    parsePackage(await file.text());
  }

  const counts = useMemo(() => {
    if (!packageData) return null;
    return packageData.items.reduce((acc, item) => {
      acc[item.kind === 'lesson' ? 'lessons' : 'mcqs'] += 1;
      acc.topics.add(item.topic_id);
      return acc;
    }, { lessons: 0, mcqs: 0, topics: new Set() });
  }, [packageData]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1>Content Engine</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Bring approved TNPSC Group 2 / 2A content from the retrieval and intelligence engines into the existing platform review workflow.
          </p>
        </div>
        <Link href="/admin/review" className="btn btn-primary" style={{ textDecoration: 'none' }}>Open review queue</Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="eyebrow">AI lesson generation</span>
        <h2 style={{ marginTop: 8 }}>Generate from approved source material</h2>
        <p className="muted" style={{ marginTop: 6, fontSize: '0.84rem' }}>
          Choose a syllabus topic with approved, non-PYQ study resources. The generator creates a beginner-friendly lesson and original MCQs with source evidence. AI-suggested answers remain unverified until an admin checks them.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px auto', gap: 10, marginTop: 14, alignItems: 'end' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Syllabus topic
            <select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <option value="">Choose a topic…</option>
              {generationTopics.map((topic) => (
                <option key={topic.topicId} value={topic.topicId} disabled={topic.approvedSourceCount === 0}>
                  {topic.subjectName} · {topic.chapterName} · {topic.topicName} ({topic.approvedSourceCount} sources)
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            MCQ count
            <select value={mcqCount} onChange={(event) => setMcqCount(Number(event.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)' }}>
              {[3, 5, 8, 10].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={!selectedTopicId || generating} onClick={generateTopicContent}>
            {generating ? 'Generating…' : 'Generate lesson + MCQs'}
          </button>
        </div>
        {generationMessage && (
          <div className="card-sunk" style={{ marginTop: 12, background: generationMessage.type === 'error' ? 'var(--warm-tint)' : 'var(--paper)' }}>
            <p>{generationMessage.text}</p>
          </div>
        )}
        {generationQuality && (
          <div className="stat-row" style={{ marginTop: 12 }}>
            <Stat value={generationQuality.lessonCount} label="lesson" />
            <Stat value={generationQuality.mcqCount} label="MCQs" />
            <Stat value={generationQuality.sourceCount} label="approved sources" />
            <Stat value="Human check" label="answer verification" />
          </div>
        )}
        <p className="muted" style={{ marginTop: 10, fontSize: '0.78rem' }}>
          Generation does not publish. The generated package is placed in the import panel below and must be imported into the review queue before an authorised reviewer can approve it.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="eyebrow">Engine publication</span>
        <h2 style={{ marginTop: 8 }}>Import a publication package</h2>
        <p className="muted" style={{ marginTop: 6, fontSize: '0.84rem' }}>
          The engine remains the source of generated content. This admin module only accepts its signed-by-contract manifest, validates it again on the server, and stages content for human review. PYQs never enter this path.
        </p>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Choose package JSON
            <input type="file" accept="application/json,.json" onChange={readFile} style={{ display: 'none' }} />
          </label>
          {fileName && <span className="muted" style={{ fontSize: '0.8rem' }}>{fileName}</span>}
        </div>

        <textarea
          value={packageText}
          onChange={(event) => parsePackage(event.target.value)}
          placeholder={'Paste the engine publication JSON here…'}
          spellCheck={false}
          style={{ width: '100%', minHeight: 260, marginTop: 14, padding: 14, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.78rem' }}
        />

        {counts && (
          <div className="stat-row" style={{ marginTop: 14 }}>
            <Stat value={counts.lessons} label="lessons" />
            <Stat value={counts.mcqs} label="MCQs" />
            <Stat value={counts.topics.size} label="topics" />
            <Stat value={packageData.publicationId} label="publication" />
          </div>
        )}

        {message && (
          <div className="card-sunk" style={{ marginTop: 14, background: message.type === 'error' ? 'var(--warm-tint)' : 'var(--paper)' }}>
            <p>{message.text}</p>
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-primary" disabled={!packageData || importing} onClick={importPackage}>
            {importing ? 'Importing…' : 'Import to review queue'}
          </button>
          <button type="button" className="btn" disabled={importing && !packageText} onClick={() => { setPackageText(''); setPackageData(null); setMessage(null); setFileName(''); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <span className="eyebrow">Publication history</span>
            <h2 style={{ marginTop: 8 }}>Engine → platform lineage</h2>
          </div>
          <button type="button" className="btn" onClick={loadPublications}>Refresh</button>
        </div>
        <p className="muted" style={{ marginTop: 6, fontSize: '0.84rem' }}>
          Imported content is staged first. Approval in the existing Review Queue is the only route to learner-visible content; publication, topic, source and version lineage remain queryable from the platform.
        </p>
        {loadError && <div className="card-sunk" style={{ marginTop: 14, background: 'var(--warm-tint)' }}>{loadError}</div>}
        {!publications && !loadError && <p className="muted" style={{ marginTop: 16 }}>Loading…</p>}
        {publications?.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No engine publications imported yet.</p>}
        {publications?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {publications.map((publication) => <PublicationRow key={publication.publication_id} publication={publication} />)}
          </div>
        )}
      </div>
    </>
  );
}

export default function ContentEnginePage() {
  return (
    <AdminGuard>
      <ContentEngineBody />
    </AdminGuard>
  );
}
