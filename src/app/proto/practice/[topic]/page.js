'use client';

import { use } from 'react';
import QuestionSession from '../../_components/QuestionSession';
import { usePractice } from '../../../../hooks/usePractice';

export default function Practice({ params }) {
  const { topic } = use(params);
  const session = usePractice(topic);

  return <QuestionSession key={topic} session={session} mode="PRACTICE" backHref="/proto/home" />;
}
