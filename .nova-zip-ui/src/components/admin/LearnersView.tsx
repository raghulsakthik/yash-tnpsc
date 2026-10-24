import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  MoreVertical,
  AlertTriangle,
  History,
  TrendingUp,
  X,
} from 'lucide-react';
import { LearnerRecord, AdminRole } from '../../types/admin';
import { checkPermission } from '../../utils/adminPermissions';

interface LearnersViewProps {
  role: AdminRole;
  learners: LearnerRecord[];
  onUpdateLearnerStatus: (learnerId: string, newStatus: LearnerRecord['accountStatus'], reason: string) => void;
  onAddLearner: (learner: Partial<LearnerRecord>) => void;
}

export const LearnersView: React.FC<LearnersViewProps> = ({
  role,
  learners,
  onUpdateLearnerStatus,
  onAddLearner,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LearnerRecord['accountStatus']>('ALL');
  const [selectedLearner, setSelectedLearner] = useState<LearnerRecord | null>(null);
  const [suspensionModalLearner, setSuspensionModalLearner] = useState<LearnerRecord | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isNewLearnerModalOpen, setIsNewLearnerModalOpen] = useState(false);
  const [newLearnerName, setNewLearnerName] = useState('');
  const [newLearnerEmail, setNewLearnerEmail] = useState('');
  const [newLearnerTrack, setNewLearnerTrack] = useState('TNPSC Group 2 & 2A Combined');

  const canCreate = checkPermission(role, 'Learner', 'CREATE').allowed;
  const canUpdate = checkPermission(role, 'Learner', 'UPDATE').allowed;

  const filtered = learners.filter((lrn) => {
    const matchesSearch =
      lrn.name.toLowerCase().includes(search.toLowerCase()) ||
      lrn.email.toLowerCase().includes(search.toLowerCase()) ||
      lrn.handle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || lrn.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmSuspension = () => {
    if (!suspensionModalLearner) return;
    const nextStatus =
      suspensionModalLearner.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    onUpdateLearnerStatus(
      suspensionModalLearner.id,
      nextStatus,
      suspensionReason || (nextStatus === 'SUSPENDED' ? 'Operational suspension' : 'Reactivated after verification')
    );
    setSuspensionModalLearner(null);
    setSuspensionReason('');
  };

  const handleCreateLearner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLearnerName || !newLearnerEmail) return;
    onAddLearner({
      id: `lrn-${Date.now()}`,
      name: newLearnerName,
      email: newLearnerEmail,
      handle: `@${newLearnerName.toLowerCase().replace(/\s+/g, '_')}`,
      targetTrack: newLearnerTrack,
      targetExam: 'TNPSC',
      accountStatus: 'ACTIVE',
      level: 1,
      totalXp: 0,
      streakDays: 0,
      studyTimeHours: 0,
      accuracyRate: 0,
      overallReadiness: 0,
      completedLessons: 0,
      testsAttempted: 0,
      weakTopics: [],
      strongTopics: [],
      lastActive: 'Just now',
      createdAt: new Date().toISOString(),
    });
    setIsNewLearnerModalOpen(false);
    setNewLearnerName('');
    setNewLearnerEmail('');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Learner Management & Governance
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Monitor aspirant profiles, readiness metrics, study streaks, and account statuses.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsNewLearnerModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 shadow-xs cursor-pointer transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Enroll New Learner</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(['ALL', 'ACTIVE', 'FLAGGED_PROCTORING', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap font-medium ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {st === 'ALL' ? 'All Aspirants' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Learners Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="p-4">Learner</th>
                <th className="p-4">Exam Track</th>
                <th className="p-4">Readiness & Accuracy</th>
                <th className="p-4">Activity & Streak</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((lrn) => (
                <tr
                  key={lrn.id}
                  className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 font-bold text-white shadow-xs">
                        {lrn.avatarText || lrn.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">{lrn.name}</div>
                        <div className="text-[11px] text-neutral-400">{lrn.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {lrn.targetTrack}
                    </span>
                    <div className="text-[10px] text-neutral-400">Phase {lrn.currentPhase} · Level {lrn.level}</div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {lrn.overallReadiness}%
                      </span>
                      <span className="text-neutral-400">·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {lrn.accuracyRate}% acc
                      </span>
                    </div>
                    <div className="mt-1 w-24 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${lrn.overallReadiness}%` }}
                      />
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span>{lrn.streakDays}d streak</span>
                      <span className="text-neutral-400">·</span>
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>{lrn.studyTimeHours}h</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Active {lrn.lastActive}</div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        lrn.accountStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : lrn.accountStatus === 'FLAGGED_PROCTORING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {lrn.accountStatus === 'ACTIVE' && <CheckCircle2 className="h-3 w-3" />}
                      {lrn.accountStatus === 'FLAGGED_PROCTORING' && <AlertTriangle className="h-3 w-3" />}
                      {lrn.accountStatus === 'SUSPENDED' && <XCircle className="h-3 w-3" />}
                      <span>{lrn.accountStatus}</span>
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedLearner(lrn)}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                      >
                        Details
                      </button>

                      {canUpdate && (
                        <button
                          onClick={() => {
                            setSuspensionModalLearner(lrn);
                            setSuspensionReason(lrn.suspensionReason || '');
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                            lrn.accountStatus === 'SUSPENDED'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400'
                          }`}
                        >
                          {lrn.accountStatus === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Learner Detail Drawer / Modal */}
      {selectedLearner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 font-bold text-white text-lg">
                  {selectedLearner.avatarText || selectedLearner.name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {selectedLearner.name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedLearner.handle} · {selectedLearner.email} · {selectedLearner.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLearner(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <span className="text-[10px] text-neutral-500">Readiness</span>
                <div className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedLearner.overallReadiness}%
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <span className="text-[10px] text-neutral-500">Accuracy</span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedLearner.accuracyRate}%
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <span className="text-[10px] text-neutral-500">Total XP</span>
                <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {selectedLearner.totalXp}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                <span className="text-[10px] text-neutral-500">Tests Done</span>
                <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {selectedLearner.testsAttempted}
                </div>
              </div>
            </div>

            {/* Diagnostic Topics */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Weak Remediation Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedLearner.weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  >
                    ⚠️ {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Demonstrated Strong Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedLearner.strongTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    ✓ {topic}
                  </span>
                ))}
              </div>
            </div>

            {selectedLearner.suspensionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <strong>Recorded Suspension Reason:</strong> {selectedLearner.suspensionReason}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLearner(null)}
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Reason Modal (Mandatory Audit Logging) */}
      {suspensionModalLearner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {suspensionModalLearner.accountStatus === 'SUSPENDED'
                ? `Reactivate ${suspensionModalLearner.name}?`
                : `Suspend ${suspensionModalLearner.name}?`}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Per NOVA Governance Specification, all learner account status modifications are recorded in the immutable audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Operational Reason / Incident Reference
              </label>
              <textarea
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter justification (e.g., Proctoring violation confirmed, or Identity reverified)..."
                className="w-full rounded-xl border border-neutral-200 p-3 text-xs focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmSuspension}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white cursor-pointer ${
                  suspensionModalLearner.accountStatus === 'SUSPENDED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm Status Change
              </button>
              <button
                onClick={() => setSuspensionModalLearner(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Learner Modal */}
      {isNewLearnerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateLearner}
            className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Enroll New Aspirant
              </h3>
              <button
                type="button"
                onClick={() => setIsNewLearnerModalOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={newLearnerName}
                onChange={(e) => setNewLearnerName(e.target.value)}
                placeholder="e.g., Ananya Meenakshi"
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={newLearnerEmail}
                onChange={(e) => setNewLearnerEmail(e.target.value)}
                placeholder="ananya@aspirant.edu"
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Exam Track
              </label>
              <select
                value={newLearnerTrack}
                onChange={(e) => setNewLearnerTrack(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="TNPSC Group 2 & 2A Combined">TNPSC Group 2 & 2A Combined</option>
                <option value="TNPSC Group 1 (Executive)">TNPSC Group 1 (Executive)</option>
                <option value="TNPSC Group 4 & VAO">TNPSC Group 4 & VAO</option>
                <option value="UPSC Civil Services Prelims">UPSC Civil Services Prelims</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewLearnerModalOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-orange-600 cursor-pointer"
              >
                Confirm Enrollment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
