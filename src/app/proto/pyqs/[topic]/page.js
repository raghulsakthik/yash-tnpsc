'use client';

import { use } from 'react';
import QuestionSession from '../../_components/QuestionSession';
import { usePyqs } from '../../../../hooks/usePyqs';

const EMPTY_COPY = {
  'weak-areas': {
    emptyTitle: 'Not enough data yet',
    emptyMessage: 'Answer a few more questions first so weak areas can be told apart from ones you just haven’t tried.',
  },
  'previously-wrong': {
    emptyTitle: 'Nothing open right now',
    emptyMessage: 'Every PYQ mistake has since been answered correctly.',
  },
};

export default function PyqQuestion({ params }) {
  const { topic } = use(params);
  const session = usePyqs(topic);
  const copy = EMPTY_COPY[topic] ?? {};

  return (
    <QuestionSession
      key={topic}
      session={session}
      mode="PYQ"
      backHref="/proto/pyqs"
      emptyTitle={copy.emptyTitle}
      emptyMessage={copy.emptyMessage}
    />
  );
}
