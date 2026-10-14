import StepHeader from '../../_components/StepHeader';
import ExamForm from './ExamForm';

export default function OnboardingExam() {
  return (
    <main>
      <StepHeader step={2} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your exam</p>
        <h1 style={{ fontSize: '2.25rem' }}>Which exam are we preparing for?</h1>
        <p className="muted" style={{ marginTop: 14 }}>Everything, from topic order to the questions you practise, follows this.</p>
        <div style={{ marginTop: 24 }}>
          <ExamForm />
        </div>
      </div>
    </main>
  );
}
