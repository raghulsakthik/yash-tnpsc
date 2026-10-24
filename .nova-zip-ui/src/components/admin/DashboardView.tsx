import React from 'react';
import {
  Users,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  Award,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Server,
  Layers,
} from 'lucide-react';
import {
  AdminRole,
  LearnerRecord,
  AdminLesson,
  AdminQuestion,
  AdminTest,
  ProctoringAttemptReview,
  AuditLogEntry,
} from '../../types/admin';

interface DashboardViewProps {
  role: AdminRole;
  learners: LearnerRecord[];
  lessons: AdminLesson[];
  questions: AdminQuestion[];
  tests: AdminTest[];
  proctoringReviews: ProctoringAttemptReview[];
  auditLogs: AuditLogEntry[];
  onNavigate: (slug: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  role,
  learners,
  lessons,
  questions,
  tests,
  proctoringReviews,
  auditLogs,
  onNavigate,
}) => {
  const publishedLessons = lessons.filter((l) => l.status === 'PUBLISHED').length;
  const inReviewLessons = lessons.filter((l) => l.status === 'IN_REVIEW').length;
  const publishedQuestions = questions.filter((q) => q.status === 'PUBLISHED').length;
  const inReviewQuestions = questions.filter((q) => q.status === 'IN_REVIEW').length;
  const flaggedAttempts = proctoringReviews.filter((r) => r.status === 'FLAGGED').length;
  const invalidatedAttempts = proctoringReviews.filter((r) => r.status === 'INVALIDATED').length;
  const activeLearners = learners.filter((l) => l.accountStatus === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-neutral-900 via-neutral-800 to-neutral-950 p-6 text-white shadow-xl dark:from-neutral-900 dark:via-neutral-800 dark:to-black">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NOVA Operational Control Plane · Production Engine</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              Executive Governance & Learning Oversight
            </h1>
            <p className="mt-1 text-xs text-neutral-300 max-w-2xl">
              Real-time monitoring across 5 core domains: Platform telemetry, Learner readiness, Content lifecycle, Assessment integrity, and System security logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('acceptance-tests')}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all cursor-pointer"
            >
              <FileCheck className="h-4 w-4" />
              <span>Run Acceptance Tests</span>
            </button>
            <button
              onClick={() => onNavigate('proctoring-reports')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/25 transition-all cursor-pointer backdrop-blur-md"
            >
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <span>Review Proctoring ({flaggedAttempts})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Domain KPI Grid (Specification Section 17) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Platform KPIs */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Platform</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
            {learners.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            <strong className="text-emerald-600 font-semibold">{activeLearners} Active</strong> · 4 Courses
          </div>
        </div>

        {/* Content KPIs */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Content Bank</span>
            <BookOpen className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
            {publishedLessons}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Lessons published · <span className="text-amber-600 font-bold">{inReviewLessons} in review</span>
          </div>
        </div>

        {/* Question Bank KPIs */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Questions & PYQs</span>
            <HelpCircle className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
            {publishedQuestions}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Verified MCQs · <span className="text-purple-600 font-bold">{inReviewQuestions} in queue</span>
          </div>
        </div>

        {/* Assessment & Proctoring KPIs */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Proctoring Integrity</span>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
            {flaggedAttempts}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Flagged attempts · <span className="text-red-600 font-bold">{invalidatedAttempts} Invalidated</span>
          </div>
        </div>

        {/* Operations & System KPIs */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Operations & Logs</span>
            <Server className="h-4 w-4 text-teal-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">
            {auditLogs.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Audit entries · <span className="text-emerald-600 font-bold">100% Immutable</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Learning Analytics & Quick Action Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Learning Cohort Readiness & Weak Areas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cohort Performance Overview */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Learner Cohort Readiness & Diagnostics
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Real-time aggregation across TNPSC Group 2 syllabus modules
                </p>
              </div>
              <button
                onClick={() => onNavigate('learners')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
              >
                View all learners →
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-b border-neutral-100 pb-5 dark:border-neutral-800">
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Average Readiness</span>
                <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">72.4%</div>
                <span className="text-[10px] text-emerald-600 font-semibold">+3.8% this week</span>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Average Accuracy</span>
                <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">76.8%</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Across 850+ tests</span>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Total Study Time</span>
                <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">74.0 hrs</div>
                <span className="text-[10px] text-neutral-500">Cohort active sessions</span>
              </div>
            </div>

            {/* Weak-Topic Distribution Matrix */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider dark:text-neutral-300">
                High-Intervention Topics (Adaptive Queue Triggers)
              </h4>
              <div className="mt-3 space-y-2.5">
                {[
                  { topic: 'Percentage & Profit-Loss (Aptitude)', failureRate: 58, enrolled: 42, severity: 'HIGH' },
                  { topic: 'Articles 14-32 Fundamental Rights (Polity)', failureRate: 49, enrolled: 38, severity: 'MEDIUM' },
                  { topic: 'Union Executive & Legislative Procedure (Polity)', failureRate: 44, enrolled: 29, severity: 'MEDIUM' },
                  { topic: 'Chola Village Administration (Tamil History)', failureRate: 28, enrolled: 56, severity: 'LOW' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-800/40"
                  >
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-white">{item.topic}</span>
                      <span className="ml-2 text-neutral-500">{item.enrolled} learners affected</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div
                          className={`h-full ${
                            item.severity === 'HIGH'
                              ? 'bg-red-500'
                              : item.severity === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.failureRate}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {item.failureRate}% error
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Content Workflow Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('lessons')}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-xs hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 transition-all cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Lesson Manager</span>
                <p className="text-[11px] text-neutral-500">Draft, review & publish curriculum modules</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('tests')}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-xs hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 transition-all cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Test Builder</span>
                <p className="text-[11px] text-neutral-500">Configure mocks, timings & proctoring</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Pending Reviews & Recent Audit Feed */}
        <div className="space-y-6">
          {/* Proctoring Attention Box */}
          <div className="rounded-3xl border border-red-200 bg-red-50/50 p-5 shadow-xs dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">High Risk Proctoring Alerts</h4>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              {flaggedAttempts} attempts flagged for suspicious tab switching or multi-person camera telemetry.
            </p>

            <div className="mt-3 space-y-2">
              {proctoringReviews.slice(0, 2).map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-red-200/80 bg-white p-3 text-xs shadow-xs dark:border-red-900/40 dark:bg-neutral-900"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-neutral-900 dark:text-white">{rev.learnerName}</span>
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-400">
                      Risk {rev.riskScore}/100
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500 truncate">{rev.testTitle}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-mono">{rev.violationsCount} violations</span>
                    <button
                      onClick={() => onNavigate('proctoring-reports')}
                      className="text-[11px] font-bold text-red-600 hover:underline dark:text-red-400 cursor-pointer"
                    >
                      Inspect Evidence →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit Log Feed */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Recent Security Audit Trail
              </h4>
              <button
                onClick={() => onNavigate('audit-logs')}
                className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                All logs
              </button>
            </div>

            <div className="mt-3 divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-neutral-700 dark:text-neutral-300 text-[11px] line-clamp-1">
                    {log.actorName} ({log.actorRole}): {log.reason || log.entityId}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
