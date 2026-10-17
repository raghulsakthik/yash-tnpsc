'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import AchievementUnlockBanner from '../../../_components/AchievementUnlockBanner';

export default function TestResult({ params }) {
  const { id } = use(params);
  const [test, setTest] = useState(null);
  const [error, setError] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

  useEffect(() => {
    fetch(`/api/tests/${id}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load this test');
        setTest(data);
      })
      .catch((err) => setError(err.message));

    try {
      const raw = sessionStorage.getItem(`test-new-achievements:${id}`);
      if (raw) setNewAchievements(JSON.parse(raw));
    } catch {
      // No banner if sessionStorage isn't readable -- not worth erroring the page over.
    }
  }, [id]);

  if (error) {
    return (
      <main className="shell-main" style={{ maxWidth: 760, paddingTop: 48 }}>
        <div className="card">
          <h3>Something broke</h3>
          <p className="muted" style={{ marginTop: 10 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="shell-main" style={{ maxWidth: 760, paddingTop: 48 }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (test.status !== 'COMPLETED') {
    return (
      <main className="shell-main" style={{ maxWidth: 760, paddingTop: 48 }}>
        <div className="card">
          <h3>Not finished yet</h3>
          <p className="muted" style={{ marginTop: 10 }}>This test hasn&apos;t been submitted.</p>
        </div>
      </main>
    );
  }

  const perTopic = new Map();
  for (const q of test.questions) {
    if (!perTopic.has(q.topicId)) perTopic.set(q.topicId, { topicName: q.topicName, correct: 0, total: 0 });
    const t = perTopic.get(q.topicId);
    t.total += 1;
    if (q.selectedIndex === q.correctIndex) t.correct += 1;
  }
  const topicRows = [...perTopic.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
  const wrongQuestions = test.questions.filter((q) => q.selectedIndex !== q.correctIndex);
  const correctCount = test.questions.filter((q) => q.selectedIndex === q.correctIndex).length;

  return (
    <main className="shell-main" style={{ maxWidth: 760, paddingTop: 48 }}>
      <span className="eyebrow">Weekly test</span>
      <h1 style={{ marginTop: 14 }}>{test.score}% — {correctCount} of {test.questionCount} correct</h1>

      <AchievementUnlockBanner achievements={newAchievements} />

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">By topic</span>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          {topicRows.map((t, i) => (
            <div key={t.topicName} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0',
              borderTop: i ? '1px solid var(--border)' : 'none',
            }}>
              <span>{t.topicName}</span>
              <strong>{t.correct}/{t.total}</strong>
            </div>
          ))}
        </div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20 }}>Back home</Link>
      </div>

      {wrongQuestions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <span className="eyebrow">{wrongQuestions.length} to review (also in your mistake bank)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {wrongQuestions.map((q) => (
              <div key={q.questionId} style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 600 }}>{q.prompt}</p>
                <p className="muted" style={{ marginTop: 6 }}>Correct answer: {q.options[q.correctIndex]}</p>
                <p style={{ marginTop: 6 }}>{q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
