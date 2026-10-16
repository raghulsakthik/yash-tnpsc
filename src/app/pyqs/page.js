import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { ProgressBar } from '../_components/ui';
import { pyqStats } from '../_data/mock';

const byYear = [
  { year: 2025, attempted: 18, total: 18 },
  { year: 2024, attempted: 15, total: 20 },
  { year: 2023, attempted: 8, total: 20 },
  { year: 2022, attempted: 0, total: 19 },
  { year: 2021, attempted: 0, total: 21 },
];

const modes = [
  { name: 'Topic', desc: 'Only fractions. 34 questions across nine years.', highlight: true },
  { name: 'Full year', desc: 'One complete paper, in its original order.' },
  { name: 'Mixed', desc: 'Randomised across years, exam-style.' },
  { name: 'Weak areas', desc: 'Drawn from your four weakest topics.', warm: true, meta: '22 waiting →' },
  { name: 'Previously wrong', desc: 'Only PYQs you have missed before.', meta: '9 waiting →' },
];

export default function Pyqs() {
  return (
    <AppShell>
      <span className="eyebrow">Previous year questions</span>
      <h1 style={{ marginTop: 10 }}>What they have actually asked</h1>
      <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
        Real papers, tagged to the same topics as your lessons. Every attempt counts
        towards the same mastery — these are not a separate scoreboard.
      </p>
      <div className="num" style={{ fontSize: '2.5rem', marginTop: 20 }}>{pyqStats.attempted}</div>
      <span className="muted">questions attempted</span>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Group 2 · CCSE-II', 'Group 2A', 'Group 4', 'Group 1'].map((e, i) => (
            <span key={e} className={`pill-tab ${i === 0 ? 'active' : ''}`}>{e}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {['Mathematics', 'General Tamil', 'Science', 'Polity', 'History', 'All subjects'].map((e, i) => (
            <span key={e} className={`pill-tab ${i === 0 ? 'active' : ''}`}>{e}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {['Percentage', 'Fractions', 'Ratio', 'Profit & Loss', 'Time & Work'].map((e, i) => (
            <span key={e} className={`pill-tab ${i === 1 ? 'active' : ''}`}>{e}</span>
          ))}
        </div>
      </div>

      <span className="eyebrow" style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>How you want to practise</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {modes.map((m) => (
          <Link
            key={m.name}
            href="/pyqs/fractions"
            className={m.warm ? 'card' : 'card'}
            style={{
              textDecoration: 'none', color: 'inherit',
              background: m.highlight ? 'var(--secondary-tint)' : m.warm ? 'var(--warm-tint)' : undefined,
              border: m.highlight ? '1px solid #d9d2fb' : undefined,
            }}
          >
            <h3 style={{ fontSize: '1.1rem' }}>{m.name}</h3>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>{m.desc}</p>
            <div style={{ marginTop: 14, fontWeight: 600, color: m.warm ? 'var(--warm-accent)' : 'var(--primary)' }}>
              {m.meta || 'Start →'}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">By year · Mathematics</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
            {byYear.map((y) => (
              <div key={y.year}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong className="num">{y.year}</strong>
                  <span className="muted">{y.attempted} / {y.total}</span>
                </div>
                <ProgressBar value={(y.attempted / y.total) * 100} color={y.attempted ? 'var(--success)' : 'var(--border)'} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <span className="eyebrow">What keeps coming back</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {[['Percentage', '14×'], ['Time & Work', '11×'], ['Profit & Loss', '9×'], ['Ratio & Proportion', '8×']].map(([t, n]) => (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t}</span>
                  <span className="badge badge-mastered">asked {n}</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/pyqs/analysis" className="card-dark" style={{ textDecoration: 'none' }}>
            <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Your PYQ performance</span>
            <h3 style={{ color: '#fff', marginTop: 10 }}>{pyqStats.accuracy} accuracy over {pyqStats.attempted} questions</h3>
            <p className="muted" style={{ marginTop: 8 }}>Strong on percentage, losing most marks on profit and loss.</p>
            <span style={{ color: '#fff', fontWeight: 600, display: 'inline-block', marginTop: 10 }}>See the full analysis →</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
