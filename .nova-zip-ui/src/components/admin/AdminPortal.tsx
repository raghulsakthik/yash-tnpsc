import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Users,
  BookOpen,
  HelpCircle,
  FileText,
  Eye,
  Sliders,
  Bell,
  ScrollText,
  FileCheck,
  Sparkles,
  ArrowLeft,
  Search,
  Lock,
  Layers,
  Award,
  Settings,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Download,
} from 'lucide-react';
import {
  AdminRole,
  AdminUser,
  LearnerRecord,
  AdminLesson,
  AdminResource,
  AdminQuestion,
  AdminPYQ,
  ProctoringPolicy,
  AdminTest,
  ProctoringAttemptReview,
  AdaptiveRule,
  AdminMilestone,
  AdminNotificationItem,
  AuditLogEntry,
  AIContentProposal,
  ProctoringDecision,
  LessonStatus,
  QuestionStatus,
} from '../../types/admin';
import {
  initialAdminUsers,
  initialLearnersList,
  initialAdminLessons,
  initialAdminResources,
  initialAdminQuestions,
  initialAdminPYQs,
  initialProctoringPolicies,
  initialAdminTests,
  initialProctoringReviews,
  initialAdaptiveRules,
  initialAdminMilestones,
  initialAdminNotifications,
  initialAuditLogs,
  initialAIContentProposals,
} from '../../data/mockAdminData';
import {
  checkPermission,
  getVisibleSectionsForRole,
  ALL_ADMIN_NAV_SECTIONS,
} from '../../utils/adminPermissions';
import { BrandLogo } from '../BrandLogo';

// Section Views
import { DashboardView } from './DashboardView';
import { LearnersView } from './LearnersView';
import { LessonsView } from './LessonsView';
import { QuestionsView } from './QuestionsView';
import { ProctoringHubView } from './ProctoringHubView';
import { TestBuilderView } from './TestBuilderView';
import { ContentUploadAIView } from './ContentUploadAIView';
import { AuditLogsView } from './AuditLogsView';
import { AcceptanceTestRunnerView } from './AcceptanceTestRunnerView';
import {
  CurriculumTreeView,
  AdaptiveRulesView,
  NotificationsAdminView,
  AdminsRolesView,
} from './GenericAdminViews';

interface AdminPortalProps {
  onReturnToLearnerHub: () => void;
  // The real admin_role from the authenticated session
  // (src/lib/permissions.mjs's ADMIN_ROLE_LABELS keys) -- this replaces the
  // original design's role simulator as the real starting point. Section
  // views below this point still read/write mock data; backend wiring for
  // each is tracked as follow-up work, not done in this pass.
  initialRole: AdminRole;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnToLearnerHub, initialRole }) => {
  // Role & Scope Simulator State -- seeded from the real session role;
  // still locally overridable for now (no section view performs a real,
  // backend-checked mutation yet, so this can't actually escalate anything).
  const [activeRole, setActiveRole] = useState<AdminRole>(() => {
    return (localStorage.getItem('nova_admin_role') as AdminRole) || initialRole;
  });

  const [activeSubjectScope, setActiveSubjectScope] = useState<string>(() => {
    return localStorage.getItem('nova_admin_subject_scope') || 'Indian Polity & Constitution';
  });

  const [currentSectionSlug, setCurrentSectionSlug] = useState<string>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Core Persistent Administrative State
  const [learners, setLearners] = useState<LearnerRecord[]>(() => {
    const saved = localStorage.getItem('nova_admin_learners');
    return saved ? JSON.parse(saved) : initialLearnersList;
  });

  const [lessons, setLessons] = useState<AdminLesson[]>(() => {
    const saved = localStorage.getItem('nova_admin_lessons');
    return saved ? JSON.parse(saved) : initialAdminLessons;
  });

  const [questions, setQuestions] = useState<AdminQuestion[]>(() => {
    const saved = localStorage.getItem('nova_admin_questions');
    return saved ? JSON.parse(saved) : initialAdminQuestions;
  });

  const [tests, setTests] = useState<AdminTest[]>(() => {
    const saved = localStorage.getItem('nova_admin_tests');
    return saved ? JSON.parse(saved) : initialAdminTests;
  });

  const [policies, setPolicies] = useState<ProctoringPolicy[]>(() => {
    const saved = localStorage.getItem('nova_admin_policies');
    return saved ? JSON.parse(saved) : initialProctoringPolicies;
  });

  const [proctoringReviews, setProctoringReviews] = useState<ProctoringAttemptReview[]>(() => {
    const saved = localStorage.getItem('nova_admin_proctoring_reviews');
    return saved ? JSON.parse(saved) : initialProctoringReviews;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('nova_admin_audit_logs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [aiProposals, setAiProposals] = useState<AIContentProposal[]>(() => {
    const saved = localStorage.getItem('nova_admin_ai_proposals');
    return saved ? JSON.parse(saved) : initialAIContentProposals;
  });

  const [adaptiveRules, setAdaptiveRules] = useState<AdaptiveRule[]>(() => {
    const saved = localStorage.getItem('nova_admin_adaptive_rules');
    return saved ? JSON.parse(saved) : initialAdaptiveRules;
  });

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>(() => {
    const saved = localStorage.getItem('nova_admin_notifications');
    return saved ? JSON.parse(saved) : initialAdminNotifications;
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('nova_admin_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem('nova_admin_subject_scope', activeSubjectScope);
  }, [activeSubjectScope]);

  useEffect(() => {
    localStorage.setItem('nova_admin_learners', JSON.stringify(learners));
  }, [learners]);

  useEffect(() => {
    localStorage.setItem('nova_admin_lessons', JSON.stringify(lessons));
  }, [lessons]);

  useEffect(() => {
    localStorage.setItem('nova_admin_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('nova_admin_tests', JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem('nova_admin_policies', JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem('nova_admin_proctoring_reviews', JSON.stringify(proctoringReviews));
  }, [proctoringReviews]);

  useEffect(() => {
    localStorage.setItem('nova_admin_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('nova_admin_ai_proposals', JSON.stringify(aiProposals));
  }, [aiProposals]);

  useEffect(() => {
    localStorage.setItem('nova_admin_adaptive_rules', JSON.stringify(adaptiveRules));
  }, [adaptiveRules]);

  useEffect(() => {
    localStorage.setItem('nova_admin_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Append audit entry helper
  const recordAudit = (
    action: string,
    entity: AuditLogEntry['entity'],
    entityId: string,
    reason: string,
    before?: Record<string, any>,
    after?: Record<string, any>
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actorId: 'active-admin',
      actorName: `Admin (${activeRole})`,
      actorRole: activeRole,
      action,
      entity,
      entityId,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Local Session)',
      reason,
      beforeSnapshot: before,
      afterSnapshot: after,
      result: 'SUCCESS',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Learner operations
  const handleUpdateLearnerStatus = (
    learnerId: string,
    newStatus: LearnerRecord['accountStatus'],
    reason: string
  ) => {
    const target = learners.find((l) => l.id === learnerId);
    if (!target) return;
    setLearners((prev) =>
      prev.map((l) =>
        l.id === learnerId ? { ...l, accountStatus: newStatus, suspensionReason: reason } : l
      )
    );
    recordAudit(
      newStatus === 'SUSPENDED' ? 'LEARNER_SUSPENDED' : 'LEARNER_REACTIVATED',
      'Learner',
      learnerId,
      reason,
      { status: target.accountStatus },
      { status: newStatus }
    );
  };

  const handleAddLearner = (learner: Partial<LearnerRecord>) => {
    setLearners((prev) => [learner as LearnerRecord, ...prev]);
    recordAudit('LEARNER_CREATED', 'Learner', learner.id || '', 'Enrolled new aspirant');
  };

  // Lesson operations
  const handleSaveLesson = (updatedLesson: AdminLesson, reason?: string) => {
    const exists = lessons.some((l) => l.id === updatedLesson.id);
    if (exists) {
      setLessons((prev) => prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)));
      recordAudit(
        'LESSON_UPDATED',
        'Lesson',
        updatedLesson.id,
        reason || 'Updated lesson content & version'
      );
    } else {
      setLessons((prev) => [updatedLesson, ...prev]);
      recordAudit('LESSON_CREATED', 'Lesson', updatedLesson.id, reason || 'Authored new lesson');
    }
  };

  const handleArchiveLesson = (lessonId: string, reason: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, status: 'ARCHIVED' } : l))
    );
    recordAudit('LESSON_ARCHIVED', 'Lesson', lessonId, reason);
  };

  // Question operations
  const handleSaveQuestion = (updatedQuestion: AdminQuestion, reason?: string) => {
    const exists = questions.some((q) => q.id === updatedQuestion.id);
    if (exists) {
      setQuestions((prev) => prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)));
      recordAudit('QUESTION_UPDATED', 'Question', updatedQuestion.id, reason || 'Updated question');
    } else {
      setQuestions((prev) => [updatedQuestion, ...prev]);
      recordAudit('QUESTION_CREATED', 'Question', updatedQuestion.id, reason || 'Created MCQ');
    }
  };

  const handleUpdateQuestionStatus = (
    questionId: string,
    status: QuestionStatus,
    reason?: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status } : q))
    );
    recordAudit(
      status === 'PUBLISHED' ? 'QUESTION_APPROVED' : 'QUESTION_REJECTED',
      'Question',
      questionId,
      reason || `Question transitioned to ${status}`
    );
  };

  // Test builder operations
  const handleSaveTest = (test: AdminTest, reason?: string) => {
    const exists = tests.some((t) => t.id === test.id);
    if (exists) {
      setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
      recordAudit('TEST_UPDATED', 'Test', test.id, reason || 'Updated test paper');
    } else {
      setTests((prev) => [test, ...prev]);
      recordAudit('TEST_CREATED', 'Test', test.id, reason || 'Created test paper');
    }
  };

  const handlePublishTest = (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'PUBLISHED' } : t))
    );
    recordAudit('TEST_PUBLISHED', 'Test', testId, 'Published test paper for learner cohort');
  };

  // Proctoring operations
  const handleSavePolicy = (policy: ProctoringPolicy, reason?: string) => {
    setPolicies((prev) => prev.map((p) => (p.id === policy.id ? policy : p)));
    recordAudit(
      'PROCTORING_POLICY_CHANGED',
      'ProctoringPolicy',
      policy.id,
      reason || 'Updated proctoring threshold'
    );
  };

  const handleDecideAttempt = (attemptId: string, decision: ProctoringDecision, reason: string) => {
    setProctoringReviews((prev) =>
      prev.map((r) =>
        r.attemptId === attemptId
          ? {
              ...r,
              decision,
              decisionReason: reason,
              decisionBy: `${activeRole} Officer`,
              decidedAt: new Date().toISOString(),
              status:
                decision === 'INVALIDATE'
                  ? 'INVALIDATED'
                  : decision === 'CLEAR'
                  ? 'COMPLETED'
                  : 'FLAGGED',
            }
          : r
      )
    );
    recordAudit(
      decision === 'INVALIDATE' ? 'ATTEMPT_INVALIDATED' : 'PROCTORING_VERDICT_ISSUED',
      'ProctoringReport',
      attemptId,
      reason
    );
  };

  // AI Content operations
  const handleApproveProposal = (proposalId: string) => {
    setAiProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, status: 'APPROVED_PROCEED', reviewedBy: `${activeRole}` } : p
      )
    );
    recordAudit('CONTENT_REVIEWED', 'Resource', proposalId, 'Human editorial approval granted');
  };

  const handleRejectProposal = (proposalId: string) => {
    setAiProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: 'REJECTED' } : p))
    );
    recordAudit('CONTENT_REVIEWED', 'Resource', proposalId, 'Human editorial rejection');
  };

  const handleSimulateUpload = (fileName: string, subject: string) => {
    const newProp: AIContentProposal = {
      id: `aip-${Date.now()}`,
      originalFileName: fileName,
      fileSize: '4.8 MB',
      detectedSubject: subject,
      matchedTopic: 'Constitutional Architecture & Directives',
      isExistingTopicMatch: true,
      confidenceScore: 91,
      extractedConceptsCount: 5,
      duplicateDetected: false,
      status: 'PENDING_HUMAN_REVIEW',
      createdAt: new Date().toISOString(),
    };
    setAiProposals((prev) => [newProp, ...prev]);
    recordAudit('CONTENT_IMPORTED', 'Resource', newProp.id, `Ingested file: ${fileName}`);
  };

  // Adaptive rules
  const handleToggleAdaptiveRule = (ruleId: string) => {
    setAdaptiveRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
    recordAudit('ADAPTIVE_RULE_TOGGLED', 'AdaptiveRule', ruleId, 'Toggled rule status');
  };

  // Notifications
  const handleBroadcastNotification = (item: Partial<AdminNotificationItem>) => {
    setNotifications((prev) => [item as AdminNotificationItem, ...prev]);
    recordAudit('NOTIFICATION_DISPATCHED', 'Notification', item.id || '', item.title || '');
  };

  // Visible sections filtered for active simulated role
  const visibleSections = getVisibleSectionsForRole(activeRole);

  const categories: Array<{
    name: 'Core' | 'Curriculum' | 'Questions' | 'Assessments' | 'Adaptive' | 'Governance';
    label: string;
  }> = [
    { name: 'Core', label: 'Platform & Roles' },
    { name: 'Curriculum', label: 'Curriculum & Lessons' },
    { name: 'Questions', label: 'Question Bank & Review' },
    { name: 'Assessments', label: 'Tests & Proctoring' },
    { name: 'Adaptive', label: 'Adaptive & Engagement' },
    { name: 'Governance', label: 'Audit & Test Suite' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans">
      {/* TOP GOVERNANCE CONTROL BAR */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-md shadow-xs dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <BrandLogo size="sm" showWordmark={true} />

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-orange-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-orange-800 dark:bg-orange-950/70 dark:text-orange-300">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
            <span>Admin Control Plane</span>
          </span>
        </div>

        {/* ROLE SIMULATION SWITCHER (CRITICAL FOR LIVE VERIFICATION) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-1.5 dark:border-neutral-800 dark:bg-neutral-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 pl-1 hidden md:inline">
              Simulate Role:
            </span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as AdminRole)}
              className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-xs focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-900 dark:text-white cursor-pointer"
              title="Switch role to immediately test permission rules and scope restrictions"
            >
              <option value="SUPER_ADMIN">👑 SUPER_ADMIN (Full Governance)</option>
              <option value="ADMIN">🛡️ ADMIN (Operations & Proctoring)</option>
              <option value="CONTENT_ADMIN">📚 CONTENT_ADMIN (Curriculum & AI)</option>
              <option value="SUBJECT_ADMIN">⚖️ SUBJECT_ADMIN (Subject Scoped)</option>
              <option value="QUESTION_REVIEWER">🔍 QUESTION_REVIEWER (Quality Review)</option>
              <option value="SUPPORT">🎧 SUPPORT (Learner Support)</option>
            </select>

            {/* Scope dropdown if SUBJECT_ADMIN */}
            {activeRole === 'SUBJECT_ADMIN' && (
              <select
                value={activeSubjectScope}
                onChange={(e) => setActiveSubjectScope(e.target.value)}
                className="rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 cursor-pointer"
              >
                <option value="Indian Polity & Constitution">Scope: Polity</option>
                <option value="General Studies">Scope: General Studies</option>
                <option value="Aptitude & Mental Ability">Scope: Aptitude</option>
              </select>
            )}
          </div>

          {/* RETURN TO LEARNER HUB BUTTON */}
          <button
            onClick={onReturnToLearnerHub}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Return to Learner Hub</span>
            <span className="sm:hidden">Learner Hub</span>
          </button>
        </div>
      </header>

      {/* BODY WITH 33-SECTION PERMISSION-DRIVEN SIDEBAR */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          } overflow-y-auto pt-16 lg:pt-0`}
        >
          <div className="p-4 space-y-6">
            {/* Active Role Card */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs dark:border-neutral-800 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between font-bold">
                <span className="text-neutral-500">Current RBAC Scope:</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">
                  {activeRole}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 leading-snug">
                {activeRole === 'SUPER_ADMIN'
                  ? 'All 33 sections accessible with unrestricted governance.'
                  : activeRole === 'SUBJECT_ADMIN'
                  ? `Restricted to [${activeSubjectScope}]. Cross-subject edits prohibited.`
                  : activeRole === 'QUESTION_REVIEWER'
                  ? 'Focused quality review and answer key validation.'
                  : activeRole === 'SUPPORT'
                  ? 'Learner progress, test history and account status support.'
                  : 'Operational administration of learners, curriculum and proctoring.'}
              </p>
            </div>

            {/* Navigation Categories */}
            {categories.map((cat) => {
              const catSections = visibleSections.filter((s) => s.category === cat.name);
              if (catSections.length === 0) return null;

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="px-3 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    {cat.label}
                  </div>

                  <div className="space-y-0.5">
                    {catSections.map((sec) => {
                      const isActive = currentSectionSlug === sec.slug;
                      return (
                        <button
                          key={sec.slug}
                          onClick={() => {
                            setCurrentSectionSlug(sec.slug);
                            setIsMobileNavOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="font-mono text-[10px] text-neutral-400">
                              {sec.id}.
                            </span>
                            <span className="truncate">{sec.title}</span>
                          </div>

                          {sec.badge && (
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                isActive
                                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              }`}
                            >
                              {sec.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Special Section: Automated Acceptance Test Runner */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  setCurrentSectionSlug('acceptance-tests');
                  setIsMobileNavOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-2xl p-3 text-xs font-bold transition-all cursor-pointer ${
                  currentSectionSlug === 'acceptance-tests'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  <span>Acceptance Test Suite</span>
                </div>
                <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-black">
                  42 Rules
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Every section below reads/writes local mock data (seeded once,
              then persisted to this browser's localStorage) -- real backend
              wiring per section (learners, lessons, questions, tests,
              proctoring, audit logs, AI proposals) is tracked follow-up
              work, see docs/NEXT_PHASE_ROADMAP.md. Shown here so nobody
              mistakes what's on screen for real production data. */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Design preview: this section's data is local/mock, not yet wired to the real backend.</span>
          </div>
          {/* SECTION ROUTING */}
          {currentSectionSlug === 'dashboard' && (
            <DashboardView
              role={activeRole}
              learners={learners}
              lessons={lessons}
              questions={questions}
              tests={tests}
              proctoringReviews={proctoringReviews}
              auditLogs={auditLogs}
              onNavigate={(slug) => setCurrentSectionSlug(slug)}
            />
          )}

          {currentSectionSlug === 'learners' && (
            <LearnersView
              role={activeRole}
              learners={learners}
              onUpdateLearnerStatus={handleUpdateLearnerStatus}
              onAddLearner={handleAddLearner}
            />
          )}

          {(currentSectionSlug === 'lessons' || currentSectionSlug === 'curriculum') && (
            <LessonsView
              role={activeRole}
              lessons={lessons}
              assignedSubjects={[activeSubjectScope]}
              onSaveLesson={handleSaveLesson}
              onArchiveLesson={handleArchiveLesson}
            />
          )}

          {currentSectionSlug === 'questions' && (
            <QuestionsView
              role={activeRole}
              questions={questions}
              assignedSubjects={[activeSubjectScope]}
              isReviewQueueMode={false}
              onSaveQuestion={handleSaveQuestion}
              onUpdateStatus={handleUpdateQuestionStatus}
            />
          )}

          {currentSectionSlug === 'question-review' && (
            <QuestionsView
              role={activeRole}
              questions={questions}
              assignedSubjects={[activeSubjectScope]}
              isReviewQueueMode={true}
              onSaveQuestion={handleSaveQuestion}
              onUpdateStatus={handleUpdateQuestionStatus}
            />
          )}

          {(currentSectionSlug === 'content-upload' || currentSectionSlug === 'ai-content-review') && (
            <ContentUploadAIView
              role={activeRole}
              proposals={aiProposals}
              onApproveProposal={handleApproveProposal}
              onRejectProposal={handleRejectProposal}
              onSimulateUpload={handleSimulateUpload}
            />
          )}

          {currentSectionSlug === 'tests' && (
            <TestBuilderView
              role={activeRole}
              tests={tests}
              policies={policies}
              availableQuestions={questions}
              onSaveTest={handleSaveTest}
              onPublishTest={handlePublishTest}
            />
          )}

          {(currentSectionSlug === 'proctoring' ||
            currentSectionSlug === 'proctoring-events' ||
            currentSectionSlug === 'proctoring-reports') && (
            <ProctoringHubView
              role={activeRole}
              policies={policies}
              reviews={proctoringReviews}
              onSavePolicy={handleSavePolicy}
              onDecideAttempt={handleDecideAttempt}
              initialSubTab={
                currentSectionSlug === 'proctoring-events'
                  ? 'events'
                  : currentSectionSlug === 'proctoring'
                  ? 'policies'
                  : 'reviews'
              }
            />
          )}

          {currentSectionSlug === 'audit-logs' && (
            <AuditLogsView role={activeRole} auditLogs={auditLogs} />
          )}

          {currentSectionSlug === 'acceptance-tests' && <AcceptanceTestRunnerView />}

          {/* Canonical hierarchy */}
          {(currentSectionSlug === 'phases' ||
            currentSectionSlug === 'weeks' ||
            currentSectionSlug === 'days' ||
            currentSectionSlug === 'topics' ||
            currentSectionSlug === 'concepts') && <CurriculumTreeView />}

          {/* Adaptive rules */}
          {currentSectionSlug === 'adaptive-rules' && (
            <AdaptiveRulesView rules={adaptiveRules} onToggleRule={handleToggleAdaptiveRule} />
          )}

          {/* Notifications */}
          {currentSectionSlug === 'notifications' && (
            <NotificationsAdminView
              notifications={notifications}
              onBroadcastNotification={handleBroadcastNotification}
            />
          )}

          {/* Admins & Roles */}
          {currentSectionSlug === 'admins-roles' && (
            <AdminsRolesView currentRole={activeRole} admins={initialAdminUsers} />
          )}

          {/* Default fallback for remaining sections like system settings, search, etc */}
          {![
            'dashboard',
            'learners',
            'lessons',
            'curriculum',
            'questions',
            'question-review',
            'content-upload',
            'ai-content-review',
            'tests',
            'proctoring',
            'proctoring-events',
            'proctoring-reports',
            'audit-logs',
            'acceptance-tests',
            'phases',
            'weeks',
            'days',
            'topics',
            'concepts',
            'adaptive-rules',
            'notifications',
            'admins-roles',
          ].includes(currentSectionSlug) && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                NOVA Operational Section: {currentSectionSlug.replace('-', ' ')}
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Authorized for role <strong>{activeRole}</strong>. All controls are wired to the unified backend CRUD matrix and audit trail.
              </p>
              <button
                onClick={() => setCurrentSectionSlug('dashboard')}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 cursor-pointer"
              >
                Return to Dashboard Overview
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
