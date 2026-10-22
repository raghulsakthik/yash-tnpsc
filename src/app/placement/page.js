import StepHeader from '../_components/StepHeader';
import PlacementQuestion from './PlacementQuestion';

export default function Placement() {
  return (
    <main>
      <StepHeader step={3} total={4} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Where to start</p>
        <h1 style={{ fontSize: '2.25rem' }}>A few gentle questions</h1>
        <p className="muted" style={{ marginTop: 14 }}>
          Real questions from the actual question bank, across every subject with content so far. &quot;Not
          sure&quot; is a perfectly good answer -- this only finds where to start.
        </p>
        <PlacementQuestion />
      </div>
    </main>
  );
}
