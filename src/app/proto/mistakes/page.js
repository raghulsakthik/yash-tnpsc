'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { useMistakes } from '../../../hooks/useMistakes';

const MISTAKE_LABEL = {
  CONCEPTUAL: 'Conceptual',
  CARELESS: 'Careless',
  GUESS: 'Guessed',
  TIME_PRESSURE: 'Ran out of time',
  OVERCONFIDENT: 'Overconfident',
  UNKNOWN: 'Unclassified',
};

export default function Mistakes() {
  const { items, error, tutorHint, tutorLoading, askTutor } = useMistakes();
  const [activeTag, setActiveTag] = useState('ALL');

  if (error) {
    return (
      <AppShell>
        <span className="eyebrow">My mistakes</span>
        <div className="card-sunk" style={{ marginTop: 16, background: 'var(--warm-tint)' }}>
          <p style={{ margin: 0 }}>Could not load the mistake bank: {error}</p>
        </div>
      </AppShell>
    );
  }

  if (items === null) {
    return (
      <AppShell>
        <p className="muted">Loading…</p>
      </AppShell>
    );
  }

  if (items.length === 0) {
    return (
      <AppShell>
        <span className="eyebrow">My mistakes</span>
        <h1 style={{ marginTop: 10 }}>Nothing open right now</h1>
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ margin: 0 }}>Every past mistake has since been answered correctly.</p>
        </div>
      </AppShell>
    );
  }

  const counts = items.reduce((acc, m) => {
    acc[m.mistakeType] = (acc[m.mistakeType] ?? 0) + 1;
    return acc;
  }, {});
  const visible = activeTag === 'ALL' ? items : items.filter((m) => m.mistakeType === activeTag);
  const [featured, ...rest] = visible.length > 0 ? visible : items;

  return (
    <AppShell>
      <span className="eyebrow">My mistakes</span>
      <h1 style={{ marginTop: 10 }}>{items.length} worth returning to</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Not every wrong answer lands here — only the ones still open. Each leaves once you&apos;ve got it right again.
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <span className={`pill-tab ${activeTag === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTag('ALL')} style={{ cursor: 'pointer' }}>
          All · {items.length}
        </span>
        {Object.entries(counts).map(([type, count]) => (
          <span
            key={type}
            className={`pill-tab ${activeTag === type ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTag(type)}
          >
            {MISTAKE_LABEL[type] ?? type} · {count}
          </span>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge" style={{ background: 'var(--warm-tint)', color: 'var(--warm-accent)' }}>
            {MISTAKE_LABEL[featured.mistakeType] ?? featured.mistakeType}
          </span>
          <span className="badge" style={{ background: 'var(--secondary-tint)', color: 'var(--primary)' }}>{featured.topicName}</span>
        </div>
        <h3 style={{ marginTop: 14 }}>{featured.prompt}</h3>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: '0.85rem' }}>
          <div>
            <span className="muted">Rests on</span><br />
            <strong>{featured.weakestPrerequisite?.topicName ?? '—'}</strong>
          </div>
          <div>
            <span className="muted">Last attempt</span><br />
            <strong>{new Date(featured.createdAt).toLocaleDateString()}</strong>
          </div>
          <div>
            <span className="muted">Next review</span><br />
            <strong style={{ color: 'var(--primary)' }}>
              {featured.nextReview ? new Date(featured.nextReview).toLocaleDateString() : 'Not scheduled yet'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link href={`/proto/practice/${featured.topicId}`} className="btn btn-primary">Try it again</Link>
          <button type="button" className="btn btn-secondary" onClick={() => askTutor(featured.questionId)} disabled={tutorLoading}>
            {tutorLoading ? 'Asking…' : 'Ask the tutor'}
          </button>
          {featured.weakestPrerequisite ? (
            <Link href={`/proto/practice/${featured.weakestPrerequisite.topicId}`} className="btn btn-secondary">
              Reteach {featured.weakestPrerequisite.topicName}
            </Link>
          ) : (
            <button type="button" className="btn btn-secondary" disabled>Reteach the prerequisite</button>
          )}
        </div>
        {tutorHint && (
          <div className="card-sunk" style={{ marginTop: 16 }}>
            <p style={{ margin: 0 }}>{tutorHint}</p>
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 0 }}>
          {rest.map((m, i) => (
            <div
              key={m.questionId}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                padding: '18px 24px', borderTop: i ? '1px solid var(--border)' : 'none',
              }}
            >
              <div>
                <strong>{m.prompt}</strong>
                <div className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {m.topicName} · {MISTAKE_LABEL[m.mistakeType] ?? m.mistakeType}
                </div>
              </div>
              <Link href={`/proto/practice/${m.topicId}`} className="muted" style={{ textDecoration: 'none' }}>→</Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
