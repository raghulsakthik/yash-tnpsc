'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../_components/AppShell';
import { quickLabModes } from '../_data/mock';
import { getQuickLabModes } from '../../../api/quickLab.api';
import { QUICK_LAB_BANK_BACKED as BANK_BACKED } from '../../../hooks/useQuickLab';

function statFor(real) {
  if (!real?.best) return 'New · no score yet';
  return `Best ${real.best.accuracyPct}% · ${real.best.avgSeconds}s avg`;
}

export default function QuickLab() {
  const [realModes, setRealModes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getQuickLabModes()
      .then((data) => !cancelled && setRealModes(data.items ?? []))
      .catch(() => !cancelled && setRealModes([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const realBySlug = new Map((realModes ?? []).map((m) => [m.slug, m]));
  const displayModes = quickLabModes.map((m) =>
    BANK_BACKED.has(m.slug) ? { ...m, stat: statFor(realBySlug.get(m.slug)), real: true } : m
  );

  return (
    <AppShell>
      <span className="eyebrow">Quick Lab</span>
      <h1 style={{ marginTop: 10 }}>Two minutes, sharper arithmetic</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        The exam is won on speed as much as accuracy. Every round here also tells
        the system where your calculation is slow — it isn&apos;t a separate toy.
      </p>

      <div className="card-dark" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--warm-accent)' }}>Today&apos;s challenge</span>
          <h2 style={{ marginTop: 10, color: '#fff' }}>Percentage Rush · 10 questions</h2>
          <p className="muted" style={{ marginTop: 10, maxWidth: 520 }}>
            Real percentage questions from the bank, against the clock. Every
            answer updates the same mastery model Practice and Tests feed.
          </p>
        </div>
        <Link href="/proto/quick-lab/percentage-rush" className="btn btn-light">Start challenge</Link>
      </div>

      <div className="grid-3" style={{ marginTop: 20 }}>
        {displayModes.map((m) => (
          <Link
            key={m.slug}
            href={`/proto/quick-lab/${m.slug}`}
            className="card"
            style={{
              textDecoration: 'none', color: 'inherit',
              border: m.recommended ? '2px solid var(--warm-accent)' : undefined,
              opacity: m.real ? 1 : 0.6,
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
              {m.stat}{!m.real && ' · not available yet'}
            </span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <span className="eyebrow">What a round changes</span>
        <p style={{ marginTop: 10 }}>
          Every answer in Percentage Rush and Fraction Lab sends accuracy, response
          time and difficulty back to the same learner model your lessons and
          tests feed — the other modes above aren&apos;t wired up to it yet.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {['accuracy', 'response time', 'combo', 'difficulty reached', 'mastery'].map((t) => (
            <span key={t} className="badge" style={{ background: 'var(--paper-sunk)', color: 'var(--ink-muted)' }}>{t}</span>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
