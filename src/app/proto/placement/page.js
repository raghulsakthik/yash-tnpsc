import StepHeader from '../_components/StepHeader';
import PlacementQuestion from './PlacementQuestion';

export default function Placement() {
  return (
    <main>
      <StepHeader step={4} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Where to start</p>
        <h1 style={{ fontSize: '2.25rem' }}>Twelve gentle questions</h1>
        <p className="muted" style={{ marginTop: 14 }}>&quot;Not sure yet&quot; is a perfectly good answer here.</p>
        <PlacementQuestion />
      </div>
    </main>
  );
}
