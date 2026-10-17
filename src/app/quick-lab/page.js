import Link from 'next/link';
import AppShell from '../_components/AppShell';

const MODES = [
  { slug: 'quick-math', name: 'Quick Math', desc: 'Addition, subtraction and multiplication, one tap each. A fresh pair of numbers every round.' },
  { slug: 'number-rush', name: 'Number Rush', desc: 'The same idea with bigger numbers — three-digit arithmetic under time pressure.' },
  { slug: 'percentage-rush', name: 'Percentage Rush', desc: 'Of, increase, and reverse. The three shapes TNPSC keeps asking for.', recommended: true },
  { slug: 'fraction-lab', name: 'Fraction Lab', desc: 'Compare two fractions or simplify one to its lowest terms.' },
  { slug: 'missing-number', name: 'Missing Number', desc: 'Find the pattern — arithmetic or geometric — and complete the sequence.' },
  { slug: 'memory-math', name: 'Memory Math', desc: 'Hold a few digits in your head, then recall their sum. Trains working memory, not arithmetic.' },
  { slug: 'formula-match', name: 'Formula Match', desc: 'Match the real formula to the concept — SI, CI, area, volume, time and work.' },
];

export default function QuickLab() {
  return (
    <AppShell>
      <span className="eyebrow">Quick Lab</span>
      <h1 style={{ marginTop: 10 }}>Two minutes, sharper arithmetic</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Every round generates fresh questions — never the same drill twice. The
        exam is won on speed as much as accuracy.
      </p>

      <div className="grid-3" style={{ marginTop: 24 }}>
        {MODES.map((m) => (
          <Link
            key={m.slug}
            href={`/quick-lab/${m.slug}`}
            className="card"
            style={{
              textDecoration: 'none', color: 'inherit',
              border: m.recommended ? '2px solid var(--warm-accent)' : undefined,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'var(--warm-tint)', color: 'var(--warm-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>✦</div>
            <h3 style={{ fontSize: '1.1rem' }}>{m.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.88rem' }}>{m.desc}</p>
            <hr className="rule" style={{ margin: '14px 0 10px' }} />
            <span style={{ fontSize: '0.85rem', color: m.recommended ? 'var(--warm-accent)' : 'var(--ink-muted)', fontWeight: m.recommended ? 600 : 400 }}>
              10 questions, generated fresh
            </span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">What a round is for</span>
        <p style={{ marginTop: 10 }}>
          Each round is 10 freshly generated questions — timed, scored, and
          summarised at the end with your accuracy, average answer time, and
          best combo.
        </p>
      </div>
    </AppShell>
  );
}
