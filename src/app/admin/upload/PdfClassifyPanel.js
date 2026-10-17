'use client';

import { useEffect, useRef, useState } from 'react';

function allTopics(tree) {
  return tree.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ ...t, chapterId: c.id, chapterName: c.name, subjectId: s.id }))));
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// One row's topic-assignment control: pick an existing topic, or type a new
// topic name (kept under the chapter the AI guessed, editable via dropdown).
function TopicPicker({ item, topics, onChange }) {
  const isNew = item.isNewTopic;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
      <select
        value={isNew ? '__new__' : item.topicId ?? ''}
        onChange={(e) => {
          if (e.target.value === '__new__') {
            onChange({ ...item, isNewTopic: true, topicId: null });
          } else {
            onChange({ ...item, isNewTopic: false, topicId: e.target.value });
          }
        }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--ground)', fontSize: '0.85rem' }}
      >
        <option value="">— choose a topic —</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.chapterName})</option>
        ))}
        <option value="__new__">+ Create new topic…</option>
      </select>

      {isNew && (
        <>
          <input
            type="text"
            placeholder="New topic name"
            value={item.newTopicName ?? ''}
            onChange={(e) => onChange({ ...item, newTopicName: e.target.value })}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', minWidth: 160 }}
          />
          <select
            value={item.newChapterId ?? ''}
            onChange={(e) => onChange({ ...item, newChapterId: e.target.value })}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--ground)', fontSize: '0.85rem' }}
          >
            <option value="">— under which chapter? —</option>
            {[...new Map(topics.map((t) => [t.chapterId, t])).values()].map((t) => (
              <option key={t.chapterId} value={t.chapterId}>{t.chapterName}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

export default function PdfClassifyPanel() {
  const [tree, setTree] = useState([]);
  const [proposal, setProposal] = useState(null); // { mcqs, resources, truncated }
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const topics = allTopics(tree);

  useEffect(() => {
    fetch('/api/admin/syllabus', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setTree(d.subjects ?? []))
      .catch(() => {});
  }, []);

  async function analyze() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProposal(null);
    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/admin/content/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not analyze that document');
      setProposal({
        mcqs: data.mcqs.map((m) => ({ ...m, included: true })),
        resources: data.resources.map((r) => ({ ...r, included: true })),
        truncated: data.truncated,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateMcq(index, next) {
    setProposal((p) => ({ ...p, mcqs: p.mcqs.map((m, i) => (i === index ? next : m)) }));
  }
  function updateResource(index, next) {
    setProposal((p) => ({ ...p, resources: p.resources.map((r, i) => (i === index ? next : r)) }));
  }

  async function commit() {
    setCommitting(true);
    setError(null);
    try {
      const included = {
        mcqs: proposal.mcqs.filter((m) => m.included),
        resources: proposal.resources.filter((r) => r.included),
      };

      const missing = [...included.mcqs, ...included.resources].find((i) => !i.topicId && !(i.isNewTopic && i.newTopicName && i.newChapterId));
      if (missing) throw new Error('Every included item needs a topic -- pick an existing one or fill in the new-topic name and chapter.');

      // Collapse repeated "new topic" choices (same name+chapter) into one topic each.
      const newTopicKey = (i) => `${i.newChapterId}::${slugify(i.newTopicName)}`;
      const newTopicsByKey = new Map();
      for (const item of [...included.mcqs, ...included.resources]) {
        if (!item.isNewTopic) continue;
        const key = newTopicKey(item);
        if (!newTopicsByKey.has(key)) {
          const chapter = topics.find((t) => t.chapterId === item.newChapterId);
          newTopicsByKey.set(key, {
            topicId: `${item.newChapterId.split('.')[0]}.${slugify(item.newTopicName)}`,
            topicName: item.newTopicName,
            chapterId: item.newChapterId,
            chapterName: chapter?.chapterName,
            subjectId: chapter?.subjectId,
          });
        }
      }
      const resolveTopicId = (item) => (item.isNewTopic ? newTopicsByKey.get(newTopicKey(item)).topicId : item.topicId);

      const body = {
        newTopics: [...newTopicsByKey.values()],
        mcqs: included.mcqs.map((m) => ({
          topicId: resolveTopicId(m),
          question: m.question,
          options: m.options,
          answerIndex: m.answerIndex,
          explanation: m.explanation,
          trap: m.trap,
          diagramImage: m.diagramImage ?? null,
        })),
        resources: included.resources.map((r) => ({
          topicId: resolveTopicId(r),
          title: r.title,
          body: r.body,
          diagramImage: r.diagramImage ?? null,
        })),
      };

      const res = await fetch('/api/admin/content/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Commit failed');
      setResult(data);
      setProposal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <span className="eyebrow">Upload a document</span>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
          PDF, Word (.docx), or plain text (.txt) -- no YAML, no formatting required. Mixed content is fine:
          MCQs with answers, study notes, several topics in one file, even brand new topics. The AI reads it
          once, extracts and cleans up the text, and proposes where each piece goes, pre-filling a topic (new
          or existing) for everything. Nothing is saved until you commit below -- edit anything first if needed,
          or just hit commit as-is. This is the one admin action that spends an AI call -- the manual YAML
          upload stays free.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,application/pdf,text/plain" />
          <button type="button" className="btn btn-primary" onClick={analyze} disabled={analyzing}>
            {analyzing ? 'Reading and classifying… large files (100+ questions) can take a few minutes' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      {result && (
        <div className="card" style={{ background: 'var(--success-tint)' }}>
          <strong>Done.</strong> {result.topicsCreated} new topic(s), {result.insertedQuestions} new questions,{' '}
          {result.updatedQuestions} updated, {result.resourcesAdded} study notes added.
        </div>
      )}

      {proposal && (
        <>
          {proposal.truncated && (
            <div className="card" style={{ background: 'var(--warm-tint)' }}>
              <p>This file was extremely large -- only the first ~40 batches of content were analyzed. Split it into smaller files and upload the rest separately to get everything.</p>
            </div>
          )}

          {proposal.mcqs.length === 0 && proposal.resources.length === 0 && (
            <div className="card"><p className="muted">No usable questions or study notes were found in this PDF.</p></div>
          )}

          {proposal.mcqs.length > 0 && (
            <div className="card">
              <span className="eyebrow">Questions found ({proposal.mcqs.length})</span>
              {proposal.mcqs.map((m, i) => (
                <div key={i} style={{ marginTop: 16, paddingTop: 16, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={m.included} onChange={(e) => updateMcq(i, { ...m, included: e.target.checked })} style={{ marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <strong>{m.question}</strong>
                      {m.needsDiagram && (
                        <div style={{ marginTop: 8 }}>
                          {m.diagramImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.diagramImage}
                              alt={`Page ${m.sourcePage} figure`}
                              style={{ maxWidth: 280, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                            />
                          ) : (
                            <p className="muted" style={{ fontSize: '0.8rem' }}>
                              This question depends on a diagram (page {m.sourcePage}) that couldn&apos;t be captured as an image.
                            </p>
                          )}
                          <span className="muted" style={{ fontSize: '0.78rem' }}>Needs a figure -- captured from page {m.sourcePage}.</span>
                        </div>
                      )}
                      <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: '0.88rem' }}>
                        {m.options.map((o, oi) => (
                          <li key={oi} style={{ fontWeight: oi === m.answerIndex ? 700 : 400, color: oi === m.answerIndex ? 'var(--success)' : 'inherit' }}>
                            {o}
                          </li>
                        ))}
                      </ul>
                      <TopicPicker item={m} topics={topics} onChange={(next) => updateMcq(i, next)} />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {proposal.resources.length > 0 && (
            <div className="card">
              <span className="eyebrow">Study notes found ({proposal.resources.length})</span>
              {proposal.resources.map((r, i) => (
                <div key={i} style={{ marginTop: 16, paddingTop: 16, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={r.included} onChange={(e) => updateResource(i, { ...r, included: e.target.checked })} style={{ marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <strong>{r.title}</strong>
                      <p style={{ marginTop: 6, fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{r.body.slice(0, 300)}{r.body.length > 300 ? '…' : ''}</p>
                      {r.needsDiagram && r.diagramImage && (
                        <div style={{ marginTop: 8 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.diagramImage}
                            alt={`Page ${r.sourcePage} figure`}
                            style={{ maxWidth: 280, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                          />
                          <span className="muted" style={{ fontSize: '0.78rem' }}>Captured from page {r.sourcePage}.</span>
                        </div>
                      )}
                      <TopicPicker item={r} topics={topics} onChange={(next) => updateResource(i, next)} />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {(proposal.mcqs.length > 0 || proposal.resources.length > 0) && (
            <button type="button" className="btn btn-primary" onClick={commit} disabled={committing} style={{ alignSelf: 'flex-start' }}>
              {committing ? 'Saving…' : 'Commit selected'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
