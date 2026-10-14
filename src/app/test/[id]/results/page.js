'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

export default function TestResults({ params }) {
  const { id } = use(params);
  const [test, setTest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/tests/${id}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? 'Could not load this test');
        setTest(data);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main>
        <h1>Something broke</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!test) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (test.status !== 'COMPLETED') {
    return (
      <main>
        <h1>Not finished yet</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>This test hasn&apos;t been submitted.</p>
          <Link href="/test" className="primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '24px' }}>
            Back to the test
          </Link>
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

  return (
    <main>
      <h1>Test results</h1>
      <div className="card">
        <p style={{ marginTop: 0, fontSize: '1.15rem' }}>
          {test.score}% — {test.questions.filter((q) => q.selectedIndex === q.correctIndex).length} of{' '}
          {test.questionCount} correct.
        </p>

        <p className="muted" style={{ marginBottom: 8 }}>
          By topic
        </p>
        {topicRows.map((t) => (
          <p key={t.topicName} style={{ margin: '4px 0' }}>
            {t.topicName}: {t.correct}/{t.total}
          </p>
        ))}

        <Link href="/" className="primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '24px', marginTop: 20 }}>
          Back home
        </Link>
      </div>

      {wrongQuestions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            {wrongQuestions.length} to review (also in your mistake bank)
          </p>
          {wrongQuestions.map((q) => (
            <div key={q.questionId} className="feedback" style={{ paddingTop: 12, marginTop: 12 }}>
              <p style={{ marginTop: 0, fontWeight: 600 }}>{q.prompt}</p>
              <p className="muted" style={{ margin: 0 }}>
                Correct answer: {q.options[q.correctIndex]}
              </p>
              <p>{q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
