'use client';

import { useState } from 'react';

export default function VocabularyPanel() {
  const [wordsText, setWordsText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function generate() {
    const words = wordsText.split(/[\n,]/).map((w) => w.trim()).filter(Boolean);
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/content/generate-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not generate vocabulary content');
      setResult(data);
      setWordsText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <span className="eyebrow">Generate English vocabulary content</span>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
          English had no content at all in the question bank. This pulls real definitions from the free,
          open-source Dictionary API (dictionaryapi.dev -- no key, no AI call) for each word you list below, and
          builds real multiple-choice questions where every option -- correct and wrong -- is a genuine
          dictionary definition, not invented text. At least 4 words are needed so wrong options are honest.
          Content lands in General English &gt; Vocabulary.
        </p>
        <textarea
          rows={6}
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={'One word per line, or comma-separated\ne.g.\nausterity\npragmatic\nresilient\nvindicate'}
          style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }}
        />
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={generate} disabled={generating}>
          {generating ? 'Looking up definitions…' : 'Generate'}
        </button>
      </div>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      {result && (
        <div className="card" style={{ background: 'var(--success-tint)' }}>
          <strong>Done.</strong> {result.inserted} new, {result.updated} updated.
          {result.skipped.length > 0 && (
            <p className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
              Not found in the dictionary: {result.skipped.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
