import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  AlertTriangle,
  Camera,
  Maximize,
  Copy,
  Users,
  WifiOff,
  CheckCircle2,
  XCircle,
  FileCheck,
  Sliders,
  Clock,
  ExternalLink,
  X,
  History,
} from 'lucide-react';
import {
  AdminRole,
  ProctoringPolicy,
  ProctoringEvent,
  ProctoringAttemptReview,
  ProctoringDecision,
} from '../../types/admin';
import { checkPermission, validateProctoringDecision } from '../../utils/adminPermissions';

interface ProctoringHubViewProps {
  role: AdminRole;
  policies: ProctoringPolicy[];
  reviews: ProctoringAttemptReview[];
  onSavePolicy: (policy: ProctoringPolicy, reason?: string) => void;
  onDecideAttempt: (attemptId: string, decision: ProctoringDecision, reason: string) => void;
  initialSubTab?: 'policies' | 'events' | 'reviews';
}

export const ProctoringHubView: React.FC<ProctoringHubViewProps> = ({
  role,
  policies,
  reviews,
  onSavePolicy,
  onDecideAttempt,
  initialSubTab = 'reviews',
}) => {
  const [subTab, setSubTab] = useState<'reviews' | 'events' | 'policies'>(initialSubTab);
  const [selectedReview, setSelectedReview] = useState<ProctoringAttemptReview | null>(null);
  const [decisionModalReview, setDecisionModalReview] = useState<ProctoringAttemptReview | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<ProctoringDecision>('FLAG');
  const [decisionReason, setDecisionReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Policy editing state
  const [editingPolicy, setEditingPolicy] = useState<ProctoringPolicy | null>(null);

  const canManagePolicies = checkPermission(role, 'ProctoringPolicy', 'UPDATE').allowed;
  const canDecide = role === 'SUPER_ADMIN' || role === 'ADMIN';

  // Gather all events from reviews
  const allEvents: ProctoringEvent[] = reviews.flatMap((r) => r.events);

  const handleOpenDecisionModal = (rev: ProctoringAttemptReview, defaultDec: ProctoringDecision) => {
    setDecisionModalReview(rev);
    setSelectedDecision(defaultDec);
    setDecisionReason('');
    setValidationError(null);
  };

  const handleConfirmDecision = () => {
    if (!decisionModalReview) return;
    const val = validateProctoringDecision(selectedDecision, decisionReason);
    if (!val.valid) {
      setValidationError(val.error || 'A detailed reason is required.');
      return;
    }

    onDecideAttempt(decisionModalReview.attemptId, selectedDecision, decisionReason);
    setDecisionModalReview(null);
    if (selectedReview?.attemptId === decisionModalReview.attemptId) {
      setSelectedReview({
        ...selectedReview,
        status:
          selectedDecision === 'INVALIDATE'
            ? 'INVALIDATED'
            : selectedDecision === 'CLEAR'
            ? 'COMPLETED'
            : 'FLAGGED',
        decision: selectedDecision,
        decisionReason,
        decisionBy: `${role} Officer`,
        decidedAt: new Date().toISOString(),
      });
    }
  };

  const handleTogglePolicySetting = (policyId: string, field: keyof ProctoringPolicy) => {
    if (!canManagePolicies) return;
    const target = policies.find((p) => p.id === policyId);
    if (!target) return;
    const updated: ProctoringPolicy = {
      ...target,
      [field]: !target[field],
    };
    onSavePolicy(updated, `Updated proctoring parameter: ${String(field)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span>NOVA Proctoring & Assessment Integrity Cockpit</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Real-time candidate telemetry, violation logs, automated risk analysis, and formal attempt decisions.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setSubTab('reviews')}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              subTab === 'reviews'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Attempt Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setSubTab('events')}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              subTab === 'events'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Incident Events Feed ({allEvents.length})
          </button>
          <button
            onClick={() => setSubTab('policies')}
            className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
              subTab === 'policies'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Security Policies ({policies.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ATTEMPT REVIEWS */}
      {subTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => setSelectedReview(rev)}
                className={`rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                  selectedReview?.id === rev.id
                    ? 'border-orange-500 bg-orange-50/20 dark:border-orange-500 dark:bg-orange-950/10'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900 dark:text-white">
                        {rev.learnerName}
                      </span>
                      <span className="text-xs text-neutral-400">({rev.learnerEmail})</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                      {rev.testTitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-black ${
                        rev.riskLevel === 'HIGH'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : rev.riskLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      Risk {rev.riskScore}/100 ({rev.riskLevel})
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        rev.status === 'INVALIDATED'
                          ? 'bg-red-600 text-white'
                          : rev.status === 'FLAGGED'
                          ? 'bg-amber-500 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-2.5 text-xs dark:bg-neutral-800/40">
                  <div>
                    <span className="text-neutral-400">Candidate Score:</span>{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {rev.score} / {rev.totalMarks} ({rev.percentage}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Violations:</span>{' '}
                    <strong className="text-red-600 dark:text-red-400">
                      {rev.violationsCount} recorded
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Decision:</span>{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {rev.decision || 'PENDING'}
                    </strong>
                  </div>
                </div>

                {rev.decisionReason && (
                  <p className="mt-2 text-[11px] text-neutral-500 italic">
                    Decision: "{rev.decisionReason}" by {rev.decisionBy}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Review Details & Decision Panel */}
          <div className="space-y-4">
            {selectedReview ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Incident Forensic Inspector
                  </h3>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {selectedReview.attemptId}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-neutral-400">Aspirant Candidate</span>
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {selectedReview.learnerName}
                  </div>
                </div>

                {/* Violation Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                    Violation Timeline ({selectedReview.events.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedReview.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-neutral-100 bg-neutral-50 p-2.5 text-xs dark:border-neutral-800 dark:bg-neutral-800/50"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-red-600 dark:text-red-400">{ev.eventType}</span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
                          {ev.evidenceDetails}
                        </p>
                        <div className="mt-1.5 text-[9px] text-neutral-400 font-mono">
                          {ev.deviceMetadata.browser} · {ev.deviceMetadata.os} · {ev.deviceMetadata.ipMasked}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {canDecide && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Issue Formal Proctoring Verdict
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenDecisionModal(selectedReview, 'CLEAR')}
                        className="rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Clear Attempt
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(selectedReview, 'WARNING')}
                        className="rounded-xl bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 cursor-pointer"
                      >
                        Issue Warning
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(selectedReview, 'FLAG')}
                        className="rounded-xl border border-red-300 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 cursor-pointer"
                      >
                        Flag for Audit
                      </button>
                      <button
                        onClick={() => handleOpenDecisionModal(selectedReview, 'INVALIDATE')}
                        className="rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                      >
                        Invalidate Attempt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-400 dark:border-neutral-700">
                Select an attempt review from the left to inspect detailed telemetry evidence and record an administrative decision.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EVENTS FEED */}
      {subTab === 'events' && (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Candidate</th>
                <th className="p-4">Event Incident</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Evidence Telemetry</th>
                <th className="p-4">Device Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {allEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                  <td className="p-4 font-mono text-[10px] text-neutral-500">
                    {new Date(ev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-4 font-bold text-neutral-900 dark:text-white">
                    {ev.learnerName}
                  </td>
                  <td className="p-4 font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                    {ev.eventType}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                        ev.severity === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : ev.severity === 'HIGH'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : ev.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="p-4 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                    {ev.evidenceDetails}
                  </td>
                  <td className="p-4 font-mono text-[10px] text-neutral-400">
                    {ev.deviceMetadata.browser} · {ev.deviceMetadata.ipMasked}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 3: SECURITY POLICIES */}
      {subTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    pol.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {pol.enabled ? 'ACTIVE POLICY' : 'DISABLED'}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Max Violations: {pol.maxViolationsAllowed}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {pol.name}
                </h3>
                <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                  {pol.learnerConsentNotice}
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {[
                  { key: 'fullscreenRequired', label: 'Fullscreen Lock Requirement', icon: Maximize },
                  { key: 'tabSwitchDetection', label: 'Tab Switch / Window Blur Tracker', icon: Eye },
                  { key: 'copyPasteRestricted', label: 'Clipboard Copy/Paste Block', icon: Copy },
                  { key: 'cameraRequired', label: 'Continuous Web Camera Stream', icon: Camera },
                  { key: 'multipleFaceDetection', label: 'Multi-Face Presence Detection', icon: Users },
                  { key: 'autoSubmitOnViolationLimit', label: 'Auto-Submit on Violation Limit', icon: ShieldAlert },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <Icon className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{label}</span>
                    </span>
                    <button
                      disabled={!canManagePolicies}
                      onClick={() =>
                        handleTogglePolicySetting(pol.id, key as keyof ProctoringPolicy)
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                        pol[key as keyof ProctoringPolicy] ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          pol[key as keyof ProctoringPolicy] ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal with Mandatory Justification */}
      {decisionModalReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Confirm Proctoring Decision: {selectedDecision}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Candidate: <strong>{decisionModalReview.learnerName}</strong> ({decisionModalReview.attemptId})
            </p>

            {validationError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {validationError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Forensic / Administrative Reason (Mandatory for Audit Trail) *
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Enter justification (minimum 8 characters, e.g., Confirmed multiple faces present in camera feed)..."
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmDecision}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
              >
                Execute Decision & Record Audit
              </button>
              <button
                onClick={() => setDecisionModalReview(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
