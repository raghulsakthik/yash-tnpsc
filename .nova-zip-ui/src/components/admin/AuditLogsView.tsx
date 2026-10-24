import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  User,
  ArrowRight,
  Download,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AuditLogEntry, AdminRole } from '../../types/admin';

interface AuditLogsViewProps {
  role: AdminRole;
  auditLogs: AuditLogEntry[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ role, auditLogs }) => {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filtered = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const distinctActions = Array.from(new Set(auditLogs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-orange-500" />
            <span>Immutable Governance Audit Trail</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Cryptographically sealed, append-only operational log recording all administrative actions, before/after diffs, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            <span>Append-Only · Tamper Proof</span>
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by action, actor, reason or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="ALL">All Actions ({auditLogs.length})</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Reason / Details</th>
                <th className="p-4">IP Metadata</th>
                <th className="p-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="p-4 font-mono text-[10px] text-neutral-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  <td className="p-4">
                    <div className="font-bold text-neutral-900 dark:text-white">{log.actorName}</div>
                    <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {log.actorRole}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="font-mono text-[11px] font-black text-orange-600 dark:text-orange-400">
                      {log.action}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {log.entity}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400">{log.entityId}</div>
                  </td>

                  <td className="p-4 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                    {log.reason || 'Routine operational modification.'}
                  </td>

                  <td className="p-4 font-mono text-[10px] text-neutral-400">
                    {log.ipAddress}
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                    >
                      Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Diff Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="font-mono text-xs font-bold text-orange-600">
                  {selectedLog.action}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Audit Entry {selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <strong className="text-neutral-700 dark:text-neutral-300">Actor:</strong>{' '}
                {selectedLog.actorName} ({selectedLog.actorRole}) · IP: {selectedLog.ipAddress}
              </div>
              <div>
                <strong className="text-neutral-700 dark:text-neutral-300">Reason:</strong>{' '}
                {selectedLog.reason || 'None provided'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <h4 className="font-bold text-neutral-500 mb-1">Before Snapshot</h4>
                <pre className="rounded-xl bg-neutral-50 p-3 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 max-h-48 overflow-y-auto">
                  {JSON.stringify(selectedLog.beforeSnapshot || { state: 'Initial' }, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-bold text-neutral-500 mb-1">After Snapshot</h4>
                <pre className="rounded-xl bg-neutral-50 p-3 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 max-h-48 overflow-y-auto">
                  {JSON.stringify(selectedLog.afterSnapshot || { state: 'Updated' }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
