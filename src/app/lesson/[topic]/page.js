import Link from 'next/link';

export default async function Lesson({ params }) {
  const { topic } = await params;
  return (
    <main className="narrow" style={{ margin: '0 auto', paddingBottom: 60, paddingLeft: 24, paddingRight: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/learn/mathematics/${topic}`} style={{ fontSize: '1.2rem', color: 'var(--ink-muted)', textDecoration: 'none' }}>×</Link>
        <strong style={{ textTransform: 'capitalize' }}>{topic.replace('-', ' ')}</strong>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < 3 ? 'var(--primary)' : 'var(--border)' }} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: '0.85rem' }}>Step 3 of 8</span>
      </div>

      <div style={{ paddingTop: 40 }}>
        <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>The idea</span>
        <h1 style={{ marginTop: 10 }}>What is a fraction?</h1>
        <p style={{ marginTop: 16, fontSize: '1.05rem' }}>
          A fraction is a way of describing part of a whole. The bottom number says
          how many equal pieces the whole was cut into. The top number says how many
          of those pieces you have.
        </p>

        <div className="card" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(to bottom, var(--paper-sunk) 50%, var(--primary) 50%)',
          }} />
          <div className="num" style={{ fontSize: '1.6rem', lineHeight: 1 }}>
            <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 2 }}>1</div>
            <div style={{ paddingTop: 2 }}>2</div>
          </div>
          <p className="muted">The whole was cut into 2 equal pieces, and you are holding 1 of them.</p>
        </div>

        <div className="card-tint" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: 'var(--secondary)' }}>Put two halves together</span>
          <div className="num" style={{ fontSize: '1.6rem', color: 'var(--primary)', marginTop: 10 }}>1/2 + 1/2 = 1</div>
          <p style={{ marginTop: 10 }}>Two pieces, each half of the whole. Together they rebuild the whole — which is why the answer is 1 and not 2/4.</p>
        </div>

        <Link href={`/practice/${topic}`} className="btn btn-primary btn-block" style={{ marginTop: 28 }}>
          I understand
        </Link>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm">Explain this differently</button>
          <button type="button" className="btn btn-secondary btn-sm">Show another example</button>
          <button type="button" className="btn btn-secondary btn-sm">I&apos;m confused</button>
        </div>
      </div>
    </main>
  );
}
