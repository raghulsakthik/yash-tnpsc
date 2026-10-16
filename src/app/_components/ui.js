// Small shared presentational primitives used across the NOVA prototype screens.

export function Badge({ status, children }) {
  const cls = `badge badge-${status}`;
  return <span className={cls}>{children}</span>;
}

export const STATUS_LABEL = {
  'not-started': 'Not started',
  learning: 'Learning',
  practising: 'Practising',
  improving: 'Improving',
  'near-mastery': 'Near mastery',
  mastered: 'Mastered',
  'revision-due': 'Revision due',
  retained: 'Retained',
  'in-progress': 'Learning',
  locked: 'Not started',
};

export function StatusBadge({ status }) {
  return <Badge status={status}>{STATUS_LABEL[status] || status}</Badge>;
}

export function ProgressBar({ value, color }) {
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${value}%`, background: color || 'var(--primary)' }}
      />
    </div>
  );
}

export function Stat({ value, label, color }) {
  return (
    <div className="stat">
      <div className="num" style={{ color: color || 'var(--ink)' }}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function ProgressRing({ value, size = 96, label }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--paper-sunk)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--primary)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="num" style={{ fontSize: size * 0.26 }}>{value}%</span>
        {label && <span className="muted" style={{ fontSize: '0.65rem' }}>{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '✦', title, note, action }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 12 }}>{icon}</div>
      <h3>{title}</h3>
      <p className="muted" style={{ marginTop: 8 }}>{note}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
