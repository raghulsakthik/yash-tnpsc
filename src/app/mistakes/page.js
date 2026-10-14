'use client';

import QuestionSession from '../_components/QuestionSession.js';

export default function Mistakes() {
  return (
    <QuestionSession
      nextQuestionUrl="/api/mistakes/next"
      submitUrl="/api/attempts"
      mode="PRACTICE"
      emptyCode="NO_MISTAKES"
      emptyTitle="No open mistakes"
      emptyMessage="Nothing to review right now — every past mistake has since been answered correctly."
    />
  );
}
