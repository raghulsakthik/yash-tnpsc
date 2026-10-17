'use client';

import { useSearchParams } from 'next/navigation';
import LiveTest from '../../_components/LiveTest';

export default function TestWeekly() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  return <LiveTest templateId={templateId} />;
}
