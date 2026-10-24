import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Award,
  Bell,
  ShieldCheck,
  Settings,
  Plus,
  Trash2,
  Check,
  Send,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  AdaptiveRule,
  AdminMilestone,
  AdminNotificationItem,
  AdminUser,
  AdminRole,
} from '../../types/admin';

/* 1. Curriculum Hierarchy View */
export const CurriculumTreeView: React.FC = () => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  const curriculumData = [
    {
      phase: 1,
      title: 'Phase 1: Constitutional Foundations & Core Doctrines',
      weeks: [
        {
          week: 1,
          title: 'Week 1: Historical Evolution & The Preamble',
          days: [
            { day: 1, topic: 'Govt of India Acts (1858-1935)', concepts: ['Federal Court', 'Provincial Autonomy', 'Diarchy Abolition'] },
            { day: 2, topic: 'Constituent Assembly Drafting', concepts: ['Drafting Committee', 'Objectives Resolution', 'Key Figures'] },
            { day: 3, topic: 'Preamble Philosophical Pillars', concepts: ['Sovereign Socialist Secular', 'Kesavananda Bharati 1973'] },
          ],
        },
        {
          week: 2,
          title: 'Week 2: Fundamental Rights (Part III)',
          days: [
            { day: 1, topic: 'Articles 14 to 18 (Right to Equality)', concepts: ['Rule of Law', 'Equal Protection', 'Untouchability Abolition'] },
            { day: 2, topic: 'Articles 19 to 22 (Right to Freedom)', concepts: ['Six Freedoms', 'Protection in Conviction', 'Preventive Detention'] },
          ],
        },
      ],
    },
    {
      phase: 2,
      title: 'Phase 2: Union & State Executive Machinery',
      weeks: [
        {
          week: 3,
          title: 'Week 3: President, Governor & Cabinets',
          days: [
            { day: 1, topic: 'President & Ordinance Making Powers', concepts: ['Article 52-62', 'Article 123 Ordinances', 'Pardoning Powers'] },
          ],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-orange-500" />
          <span>Curriculum Canonical Hierarchy Explorer</span>
        </h2>
        <p className="text-xs text-neutral-500">
          Exam → Phase → Week → Day → Topic → Concept hierarchy mapping.
        </p>
      </div>

      <div className="space-y-4">
        {curriculumData.map((p) => (
          <div
            key={p.phase}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                  Phase {p.phase}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{p.title}</h3>
              </div>
              <button
                onClick={() => setExpandedPhase(expandedPhase === p.phase ? null : p.phase)}
                className="rounded-xl border border-neutral-200 px-3 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {expandedPhase === p.phase ? 'Collapse' : 'Expand Phase'}
              </button>
            </div>

            {expandedPhase === p.phase && (
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                {p.weeks.map((w) => (
                  <div
                    key={w.week}
                    className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-2"
                  >
                    <div className="font-bold text-neutral-800 dark:text-neutral-200">
                      {w.title}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {w.days.map((d) => (
                        <div
                          key={d.day}
                          className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900"
                        >
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            Day {d.day}: {d.topic}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                            {d.concepts.map((c, i) => (
                              <span
                                key={i}
                                className="rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* 2. Adaptive Learning Rules View */
export const AdaptiveRulesView: React.FC<{
  rules: AdaptiveRule[];
  onToggleRule: (ruleId: string) => void;
}> = ({ rules, onToggleRule }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-indigo-500" />
          <span>Adaptive Recommendation & Remediation Rules</span>
        </h2>
        <p className="text-xs text-neutral-500">
          Configure diagnostic threshold gates, topic weighting, and automated remediation triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-indigo-600 uppercase">
                {rule.interventionType}
              </span>
              <button
                onClick={() => onToggleRule(rule.id)}
                className={`rounded-md px-2.5 py-0.5 text-xs font-bold cursor-pointer ${
                  rule.active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {rule.active ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            <h3 className="text-base font-bold text-neutral-900 dark:text-white">{rule.name}</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {rule.remediationRuleDescription}
            </p>

            <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-2.5 text-center text-xs dark:bg-neutral-800/40">
              <div>
                <span className="text-[10px] text-neutral-400">Topic Weight</span>
                <div className="font-bold text-neutral-900 dark:text-white">{rule.topicWeight}/10</div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400">Trigger Acc</span>
                <div className="font-bold text-red-600 dark:text-red-400">&lt; {rule.weaknessThresholdAccuracy}%</div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400">Fired Count</span>
                <div className="font-bold text-neutral-900 dark:text-white">{rule.timesTriggered}x</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 3. Notifications Admin View */
export const NotificationsAdminView: React.FC<{
  notifications: AdminNotificationItem[];
  onBroadcastNotification: (item: Partial<AdminNotificationItem>) => void;
}> = ({ notifications, onBroadcastNotification }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<AdminNotificationItem['targetAudience']>('ALL_LEARNERS');

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    onBroadcastNotification({
      id: `notif-adm-${Date.now()}`,
      title,
      message,
      category: 'system_announcement',
      channels: ['in_app', 'email'],
      targetAudience: target,
      deliveryStatus: 'SENT',
      recipientCount: 1240,
      openRatePercent: 92,
      createdAt: new Date().toISOString(),
    });
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          <span>Cohort Notifications & Dispatch Control</span>
        </h2>
        <p className="text-xs text-neutral-500">
          Broadcast study reminders, high-stakes test announcements, and milestone alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleBroadcast}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4 text-xs"
        >
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Dispatch Announcement
          </h3>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TNPSC Group 2 Prelims Mock 2 Scheduled"
              className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Message Body
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification copy delivered to candidate drawers..."
              className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Recipient Target Audience
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as AdminNotificationItem['targetAudience'])}
              className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="ALL_LEARNERS">All Registered Learners (Cohort)</option>
              <option value="TNPSC_GROUP_2">TNPSC Group 2 & 2A Enrolled</option>
              <option value="WEAK_IN_POLITY">Candidates Weak in Indian Polity</option>
              <option value="AT_RISK_PROCTORING">Aspirants with Proctoring Flags</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 transition-colors cursor-pointer shadow-xs"
          >
            Dispatch Broadcast
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Broadcast History ({notifications.length})
          </h3>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 dark:text-white text-sm">
                  {notif.title}
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {notif.deliveryStatus}
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300">{notif.message}</p>
              <div className="flex items-center justify-between pt-2 text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">
                <span>Target: {notif.targetAudience}</span>
                <span>{notif.recipientCount} Recipients · {notif.openRatePercent}% Open Rate</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* 4. Admins & Roles Matrix View (SUPER_ADMIN ONLY) */
export const AdminsRolesView: React.FC<{
  currentRole: AdminRole;
  admins: AdminUser[];
}> = ({ currentRole, admins }) => {
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            <span>Admins, Roles & Authorization Governance</span>
          </h2>
          <p className="text-xs text-neutral-500">
            {isSuperAdmin
              ? 'Full administrative governance: manage accounts, role elevations, and subject boundaries.'
              : 'Restricted View: Only SUPER_ADMIN has authority to manage administrative roles.'}
          </p>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            You are currently simulating <strong>{currentRole}</strong>. Per Section 1 & Section 3 of the specification, administrative user and role management is strictly reserved for <strong>SUPER_ADMIN</strong>.
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
            <tr>
              <th className="p-4">Admin Officer</th>
              <th className="p-4">Role Designation</th>
              <th className="p-4">Assigned Subject Scope</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {admins.map((adm) => (
              <tr key={adm.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                <td className="p-4 flex items-center gap-2.5">
                  <span className="text-lg">{adm.avatar || '👤'}</span>
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-white">{adm.name}</div>
                    <div className="text-[11px] text-neutral-400">{adm.email}</div>
                  </div>
                </td>
                <td className="p-4 font-mono font-bold text-orange-600 dark:text-orange-400">
                  {adm.role}
                </td>
                <td className="p-4 text-neutral-700 dark:text-neutral-300">
                  {adm.assignedSubjects?.join(', ') || 'Unrestricted Platform Scope'}
                </td>
                <td className="p-4">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {adm.status}
                  </span>
                </td>
                <td className="p-4 text-neutral-400">{adm.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
