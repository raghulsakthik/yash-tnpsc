import StepHeader from '../../_components/StepHeader';
import RhythmForm from './RhythmForm';

export default function OnboardingRhythm() {
  return (
    <main>
      <StepHeader step={2} total={4} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your rhythm</p>
        <h1 style={{ fontSize: '2.25rem' }}>How do your days look?</h1>
        <p className="muted" style={{ marginTop: 14 }}>You can change either of these later from Profile.</p>
        <div style={{ marginTop: 24 }}>
          <RhythmForm />
        </div>
      </div>
    </main>
  );
}
