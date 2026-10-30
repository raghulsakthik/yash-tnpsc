'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="num">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function RetrievalBody() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/retrieval/status', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `${res.status}`);
      setData(body);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function discover() {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await fetch('/api/admin/retrieval/discover', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `${res.status}`);
      setDiscoverResult(body);
      load();
    } catch (err) {
      setDiscoverResult({ error: err.message });
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Retrieval Engine</p>
        <h1 style={{ margin: '6px 0 4px' }}>Source material acquisition</h1>
        <p className="muted">
          Read-only status from the retrieval engine (discover / download / validate / SHA-256). It feeds the Content
          Engine workspace above, which stays the only path into learner-visible content.
        </p>
      </header>

      {loading && <p className="muted">Loading…</p>}

      {!loading && error === null && !data && null}

      {error && (
        <div className="card-sunk" style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700 }}>Retrieval engine unreachable</p>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>{error}</p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 10 }}>
            Set RETRIEVAL_ENGINE_URL to the engine&apos;s base URL (e.g. http://127.0.0.1:8088 for a local run of
            engines/retrieval/) and make sure it&apos;s reachable from this server.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 700 }}>{data.health.service}</p>
                <p className="muted" style={{ fontSize: '0.8rem' }}>{data.health.portal}</p>
              </div>
              <span className="eyebrow">{data.health.status}</span>
            </div>
            <div className="stat-row">
              <Stat value={data.resources.length} label="Resources catalogued" />
              <Stat value={data.summary.stored_bytes} label="Bytes stored" />
              <Stat value={data.summary.questions} label="Questions extracted" />
              <Stat value={Object.keys(data.summary.failures_by_stage || {}).length} label="Stages with failures" />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 10 }}>Trigger catalog discovery</p>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
              Calls the engine&apos;s own TNPSC Group II/IIA catalog scan. It refuses to do anything unless the
              engine&apos;s own browser session is already authenticated against the portal -- this never logs in or
              bypasses access controls on its own.
            </p>
            <button className="btn-primary" onClick={discover} disabled={discovering}>
              {discovering ? 'Discovering…' : 'Run discovery pass'}
            </button>
            {discoverResult && (
              <pre style={{ marginTop: 12, fontSize: '0.78rem', background: 'var(--paper-sunk)', padding: 10, borderRadius: 8, overflowX: 'auto' }}>
                {JSON.stringify(discoverResult, null, 2)}
              </pre>
            )}
          </div>

          <div className="card">
            <p style={{ fontWeight: 700, marginBottom: 10 }}>Catalogued resources ({data.resources.length})</p>
            {data.resources.length === 0 && <p className="muted">No resources catalogued yet.</p>}
            {data.resources.slice(0, 25).map((r) => (
              <div key={r.id} className="card-sunk" style={{ marginBottom: 8 }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.title}</p>
                <p className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                  {r.group_name} · {r.resource_type} · {r.status}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function RetrievalAdminPage() {
  return (
    <AdminGuard>
      <RetrievalBody />
    </AdminGuard>
  );
}
