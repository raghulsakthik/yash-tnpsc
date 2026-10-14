'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import QuestionSession from '../_components/QuestionSession.js';

const DEFAULT_TOPIC = 'aptitude.fractions';

function PracticeInner() {
  const topic = useSearchParams().get('topic') ?? DEFAULT_TOPIC;

  return (
    <QuestionSession
      key={topic}
      nextQuestionUrl={`/api/questions/next?topic=${topic}`}
      submitUrl="/api/attempts"
      mode="PRACTICE"
    />
  );
}

export default function Practice() {
  return (
    <Suspense fallback={<main><p className="muted">Loading…</p></main>}>
      <PracticeInner />
    </Suspense>
  );
}
