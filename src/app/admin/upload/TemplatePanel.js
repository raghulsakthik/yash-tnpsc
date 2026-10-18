'use client';

import { useEffect, useState } from 'react';

export default function TemplatePanel() {
  const [templates, setTemplates] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/admin/content/generate-templated', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        if (d.templates?.[0]) setTemplateId(d.templates[0].id);
      })
      .catch(() => {});
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/content/generate-templated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, count: Number(count) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not generate questions');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  const selected = templates?.find((t) => t.id === templateId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <span className="eyebrow">Generate from a math template</span>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
          Parameterized templates with a built-in solver -- the correct answer is computed directly from the
          generated numbers, never guessed by AI, and wrong options are built from the real mistakes students
          make (wrong base, wrong direction, forgotten division) rather than random noise. Nothing here reaches
          a learner until you approve it on the <a href="/admin/review">Review Queue</a> -- every batch lands as
          DRAFT first.
        </p>

        {templates && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Template
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)', fontFamily: 'inherit' }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.id} — {t.topicId}</option>
                ))}
              </select>
            </label>
            {selected && (
              <p className="muted" style={{ fontSize: '0.78rem' }}>
                Targets <code>{selected.topicId}</code> · type: {selected.questionType} · skills: {selected.skillsRequired.join(', ')}
              </p>
            )}
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              How many
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                style={{ display: 'block', width: 120, marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)', fontFamily: 'inherit' }}
              />
            </label>
          </div>
        )}

        <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={generate} disabled={generating || !templateId}>
          {generating ? 'Generating…' : 'Generate batch'}
        </button>
      </div>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      {result && (
        <div className="card" style={{ background: 'var(--success-tint)' }}>
          <strong>Batch created.</strong> {result.generated} questions generated ({result.rejected} candidates rejected
          by validation), average quality score {Math.round(result.avgQualityScore * 100)}%.
          <p className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
            Go to <a href="/admin/review">Review Queue</a> to approve or reject this batch.
          </p>
        </div>
      )}
    </div>
  );
}
