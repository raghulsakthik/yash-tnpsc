import Link from 'next/link';
import StepHeader from '../../_components/StepHeader';
import { ProgressBar } from '../../_components/ui';
import { placementResult } from '../../_data/mock';

export default function PlacementPlan() {
  return (
    <main>
      <StepHeader step={5} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your plan</p>
        <h1 style={{ fontSize: '2.25rem' }}>{placementResult.title}</h1>
        <p className="muted" style={{ marginTop: 14 }}>{placementResult.subtitle}</p>

        <div className="card" style={{ marginTop: 24 }}>
          <span className="eyebrow">What the check found</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {placementResult.found.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem' }}>
                  <span>{f.label}</span>
                  <strong style={{ color: f.value < 50 ? 'var(--warm-accent)' : 'var(--success)' }}>{f.value}%</strong>
                </div>
                <ProgressBar value={f.value} color={f.value < 50 ? 'var(--warm-accent)' : 'var(--success)'} />
              </div>
            ))}
          </div>
        </div>

        <div className="card-dark" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your first four weeks</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {placementResult.weeks.map((w) => (
              <div key={w.week} style={{ display: 'flex', gap: 16 }}>
                <strong style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--warm-accent)', width: 70, flexShrink: 0 }}>
                  Week {w.week}
                </strong>
                <span>{w.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <Link href="/placement" className="muted" style={{ textDecoration: 'none' }}>← Back</Link>
          <Link href="/" className="btn btn-primary">Start my first session</Link>
        </div>
      </div>
    </main>
  );
}
