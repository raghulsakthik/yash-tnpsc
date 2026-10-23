'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '../_components/AdminGuard';

const ROLE_OPTIONS = [
  ['super_admin', 'Super Admin — every permission, no subject scoping'],
  ['platform_admin', 'Platform Admin — broad operational access, not user management'],
  ['content_admin', 'Content Admin — materials, topics, review'],
  ['question_bank_admin', 'Question Bank Admin — questions, review'],
  ['subject_expert', 'Subject Expert — content/questions, restricted to assigned subjects'],
  ['question_reviewer', 'Question Reviewer — review queue only'],
  ['content_reviewer', 'Content Reviewer — review queue only'],
  ['ai_quality_admin', 'AI Quality Admin — AI config and review'],
  ['student_support_admin', 'Student Support Admin — report/support center only'],
  ['analytics_admin', 'Analytics Admin — read-only analytics'],
  ['auditor', 'Auditor — read-only everything'],
];

function SubjectPicker({ subjects, selected, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {subjects.map((s) => {
        const checked = selected.includes(s.id);
        return (
          <label
            key={s.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem',
              padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border)',
              background: checked ? 'var(--primary-tint)' : 'transparent', cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((id) => id !== s.id) : [...selected, s.id])}
            />
            {s.name}
          </label>
        );
      })}
    </div>
  );
}

function AccountRow({ account, subjects, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [adminRole, setAdminRole] = useState(account.adminRole);
  const [subjectIds, setSubjectIds] = useState(account.subjectIds);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminRole, subjectIds: adminRole === 'subject_expert' ? subjectIds : [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not save');
      onUpdated();
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove admin access for ${account.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${account.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not remove');
      onDeleted();
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{account.email}</strong>
          <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>{account.adminRoleLabel}</p>
          {account.subjectIds.length > 0 && (
            <p className="muted" style={{ marginTop: 4, fontSize: '0.78rem' }}>
              Scoped to: {account.subjectIds.map((id) => subjects.find((s) => s.id === id)?.name ?? id).join(', ')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel' : 'Edit'}</button>
          <button type="button" className="btn" style={{ color: 'var(--warm-accent)' }} disabled={busy} onClick={remove}>Remove</button>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Role
            <select
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
            >
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {adminRole === 'subject_expert' && (
            <>
              <p className="muted" style={{ marginTop: 10, fontSize: '0.8rem' }}>Assigned subjects (no access outside these):</p>
              <SubjectPicker subjects={subjects} selected={subjectIds} onChange={setSubjectIds} />
            </>
          )}
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

function NewAccountForm({ subjects, onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState('content_reviewer');
  const [subjectIds, setSubjectIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, adminRole, subjectIds: adminRole === 'subject_expert' ? subjectIds : [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create account');
      setEmail('');
      setPassword('');
      setSubjectIds([]);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <span className="eyebrow">Add an admin</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
        />
        <input
          type="password"
          placeholder="Temporary password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
        />
        <select
          value={adminRole}
          onChange={(e) => setAdminRole(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
        >
          {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {adminRole === 'subject_expert' && (
          <SubjectPicker subjects={subjects} selected={subjectIds} onChange={setSubjectIds} />
        )}
        {error && <p style={{ color: 'var(--warm-accent)', fontSize: '0.85rem' }}>{error}</p>}
        <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={submit}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [accounts, setAccounts] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);

  function load() {
    fetch('/api/admin/users', { cache: 'no-store' })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.message ?? 'Could not load admin accounts');
        setAccounts(d.accounts);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    fetch('/api/admin/syllabus', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  return (
    <AdminGuard>
      <h1>Admin users</h1>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>
        Granular admin roles instead of one blanket "admin" flag -- a Subject Expert only ever touches the
        subjects assigned below, and narrower roles (reviewer, support, analytics) can't reach what their
        role doesn't cover, even if they know the URL.
      </p>

      {error && <div className="card" style={{ background: 'var(--warm-tint)' }}><p>{error}</p></div>}

      <NewAccountForm subjects={subjects} onCreated={load} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {!accounts && !error && <p className="muted">Loading…</p>}
        {accounts?.map((a) => (
          <AccountRow key={a.id} account={a} subjects={subjects} onUpdated={load} onDeleted={load} />
        ))}
      </div>
    </AdminGuard>
  );
}
