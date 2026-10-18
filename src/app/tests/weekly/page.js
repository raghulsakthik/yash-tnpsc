'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LiveTest from '../../_components/LiveTest';

function TestWeeklyInner() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  return <LiveTest templateId={templateId} />;
}

// useSearchParams() opts the whole page out of static prerendering unless
// it's wrapped in Suspense -- Next 15's build fails outright without this
// (next dev never enforces it, which is why this only surfaces at build
// time, not in the dev server).
export default function TestWeekly() {
  return (
    <Suspense fallback={null}>
      <TestWeeklyInner />
    </Suspense>
  );
}
