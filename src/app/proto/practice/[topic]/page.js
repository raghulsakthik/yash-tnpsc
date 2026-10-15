import QuestionSession from '../../_components/QuestionSession';

export default async function Practice({ params }) {
  const { topic } = await params;

  return (
    <QuestionSession
      key={topic}
      nextQuestionUrl={`/api/questions/next?topic=${topic}`}
      submitUrl="/api/attempts"
      mode="PRACTICE"
      backHref="/proto/home"
    />
  );
}
