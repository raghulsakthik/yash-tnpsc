'use client';

import QuestionSession from '../../_components/QuestionSession';
import { useRevisionSession } from '../../../../hooks/useRevisionSession';

export default function RevisionSession() {
  const session = useRevisionSession();

  return (
    <QuestionSession
      session={session}
      mode="REVISION"
      emptyTitle="All caught up"
      emptyMessage="Nothing is due for review right now — come back tomorrow."
      backHref="/proto/revision"
    />
  );
}
