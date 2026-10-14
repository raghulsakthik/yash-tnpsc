import Link from 'next/link';
import StepHeader from '../_components/StepHeader';
import { learner } from '../_data/mock';

export default function OnboardingWelcome() {
  return (
    <main>
      <StepHeader step={1} />
      <div className="shell-main narrow" style={{ paddingTop: 40 }}>
        <p className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Welcome</p>
        <h1 style={{ fontSize: '2.25rem' }}>This was built for you, {learner.name}.</h1>
        <p className="muted" style={{ marginTop: 14, fontSize: '1.05rem' }}>
          A calm place to prepare for TNPSC, one small win at a time. Four quick
          questions and your first plan is ready.
        </p>

        <div className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            ['One thing at a time', 'Every screen tells you what to do next. Nothing else competes for attention.'],
            ['It remembers for you', 'What you learn comes back just before you would forget it.'],
            ['Mistakes are information', 'A wrong answer changes what comes next. It is never a mark against you.'],
          ].map(([title, note]) => (
            <div key={title} style={{ display: 'flex', gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: 'var(--secondary-tint)',
                color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>✦</div>
              <div>
                <strong>{title}</strong>
                <p className="muted" style={{ marginTop: 4 }}>{note}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
          <Link href="/proto/onboarding/exam" className="btn btn-primary">Let&apos;s begin</Link>
        </div>
      </div>
    </main>
  );
}
