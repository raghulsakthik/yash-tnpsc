export default function StepHeader({ step, total = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px' }}>
      <span className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}>
        <span style={{ color: 'var(--secondary)' }}>✦</span> NOVA
      </span>
      <div style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 280, margin: '0 40px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background: i < step ? 'var(--primary)' : 'var(--border)',
            }}
          />
        ))}
      </div>
      <span className="muted" style={{ fontSize: '0.85rem' }}>Step {step} of {total}</span>
    </div>
  );
}
