'use client';

/** A small celebratory banner for achievements unlocked just now. */
export default function AchievementUnlockBanner({ achievements }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        background: 'var(--warm-tint)',
        border: '1px solid var(--warm-accent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>
        {achievements.length === 1 ? 'Achievement unlocked!' : `${achievements.length} achievements unlocked!`}
      </span>
      {achievements.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
          <div>
            <strong style={{ display: 'block' }}>{a.name}</strong>
            <span className="muted" style={{ fontSize: '0.82rem' }}>{a.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
