import TestInterface from './TestInterface';

export default async function TestWeekly({ params }) {
  const { id } = await params;
  return <TestInterface testId={id} />;
}
