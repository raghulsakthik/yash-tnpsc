'use client';

import QuestionSession from '../_components/QuestionSession.js';

export default function Revision() {
  return (
    <QuestionSession
      nextQuestionUrl="/api/revision/next"
      submitUrl="/api/attempts"
      mode="REVISION"
      emptyCode="NOTHING_DUE"
      emptyTitle="All caught up"
      emptyMessage="Nothing is due for review right now — come back tomorrow."
    />
  );
}
