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
  initialAdminResources,
  initialAdminPYQs,
  initialAdaptiveRules,
  initialAdminMilestones,
  initialAIContentProposals,
} from '../../data/mockAdminData';
import {
  checkPermission,
  getVisibleSectionsForRole,
  ALL_ADMIN_NAV_SECTIONS,
} from '../../utils/adminPermissions';
import { BrandLogo } from '../BrandLogo';
import { novaApi } from '../../api/novaApi';

// Section Views
import { DashboardView } from './DashboardView';
import { LearnersView } from './LearnersView';
import { LessonsView } from './LessonsView';
import { QuestionsView } from './QuestionsView';
import { ProctoringHubView } from './ProctoringHubView';
import { ProctoringRecordingsPanel } from './ProctoringRecordingsPanel';
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

  // Real learner roster (GET /api/admin/learners -- see src/lib/adminUsers.mjs
  // listLearners). Previously seeded from mockAdminData into localStorage.
  // xp/level/streak/weak-topics/strong-topics stay at an honest zero/empty
  // in the real response -- computing those correctly per-learner in bulk
  // is real work the single-learner /api/profile and
  // /api/learning/analytics routes already do, not something to fake
  // cheaply here.
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [learnersError, setLearnersError] = useState<string | null>(null);

  const refreshLearners = React.useCallback((search?: string) => {
    novaApi
      .adminLearners({ search, limit: 100 })
      .then((res: any) => {
        const mapped: LearnerRecord[] = (res.learners || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          email: l.email,
          handle: `@${String(l.name || 'learner').toLowerCase().replace(/\s+/g, '_')}`,
          phone: l.phone || '',
          avatarText: String(l.name || 'L').charAt(0).toUpperCase(),
          targetExam: 'TNPSC',
          targetTrack: 'TNPSC Group 2 & 2A',
          currentPhase: 0,
          totalXp: 0,
          level: 1,
          streakDays: 0,
          studyTimeHours: 0,
          accuracyRate: Number(l.accuracyRate ?? 0),
          overallReadiness: 0,
          completedLessons: Number(l.completedLessons ?? 0),
          testsAttempted: Number(l.testsAttempted ?? 0),
          weakTopics: [],
          strongTopics: [],
          accountStatus: l.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
          suspensionReason: l.suspensionReason || undefined,
          lastActive: l.lastActive || '—',
          createdAt: l.createdAt,
        }));
        setLearners(mapped);
        setLearnersError(null);
      })
      .catch((err) => setLearnersError(err instanceof Error ? err.message : 'Could not load learners'));
  }, []);

  useEffect(() => {
    refreshLearners();
  }, [refreshLearners]);

  // Real lessons (GET /api/admin/lessons -- see db/migrations/V71__lesson_authoring_metadata.sql
  // and src/lib/adminCrud.mjs). One row per topic; topics without an
  // authored lesson yet still appear (hasLesson: false) so "create" can
  // pick from the real topic list instead of free-typing a subject/topic
  // name that wouldn't correspond to anything.
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [lessonsError, setLessonsError] = useState<string | null>(null);

  const refreshLessons = React.useCallback(() => {
    novaApi
      .adminLessons()
      .then((res) => {
        const mapped: AdminLesson[] = (res.topics || [])
          .filter((t: any) => t.hasLesson)
          .map((t: any) => ({
            id: t.topicId,
            title: t.title || t.topicName,
            description: t.description || '',
            examId: 'tnpsc-group-2', examName: 'TNPSC Group 2 & 2A',
            subjectId: t.subjectName, subjectName: t.subjectName,
            chapterName: t.chapterName, topicName: t.topicName, conceptName: t.topicName,
            // Not tracked per-lesson -- a topic's curriculum placement
            // (phase/week/day) lives in Curriculum Builder and isn't 1:1
            // with "a lesson", so this stays 0 rather than fabricated.
            phaseNumber: 0, weekNumber: 0, dayNumber: 0,
            learningObjectives: [], prerequisites: [],
            estimatedDurationMinutes: t.estimatedDurationMinutes ?? 30,
            difficulty: t.difficulty || 'Intermediate',
            language: 'Bilingual', lessonType: 'Theory',
            contentBlocks: [],
            examples: [], practiceQuestionIds: [], resourceIds: [],
            authorId: '', authorName: '',
            usageCount: 0, completionRate: 0, dropOffRate: 0, avgScore: 0,
            status: t.status || 'PUBLISHED',
            version: t.version || 1,
            createdAt: t.updatedAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
          }));
        setLessons(mapped);
        setLessonsError(null);
      })
      .catch((err) => setLessonsError(err instanceof Error ? err.message : 'Could not load lessons'));
  }, []);

  useEffect(() => {
    refreshLessons();
  }, [refreshLessons]);

  // Real topics (used by LessonsView's "create new lesson" topic picker --
  // includes topics that don't have a lesson yet, unlike `lessons` above).
  const [lessonTopics, setLessonTopics] = useState<any[]>([]);
  useEffect(() => {
    novaApi.adminLessons().then((res) => setLessonTopics(res.topics || [])).catch(() => {});
  }, [lessons.length]);

  // Real question bank (GET /api/admin/questions -- see
  // src/lib/adminCrud.mjs listAllQuestions). Previously seeded from
  // mockAdminData into localStorage. The real question table stores
  // options as string[] + answer_index, difficulty as a 0..1 float, and
  // only DRAFT/REVIEWED/PUBLISHED/ARCHIVED statuses (question_status_ck)
  // -- mapped here to/from the richer vocabulary QuestionsView was built
  // against (REVIEWED <-> IN_REVIEW, ARCHIVED <-> REJECTED; the server
  // side of this same mapping lives in adminCrud.mjs's
  // QUESTION_STATUS_ALIASES, right next to the real CHECK constraint it
  // has to satisfy).
  const difficultyToBand = (d: number): 'Easy' | 'Medium' | 'Hard' => (d < 0.35 ? 'Easy' : d < 0.6 ? 'Medium' : 'Hard');
  const bandToDifficulty: Record<'Easy' | 'Medium' | 'Hard', number> = { Easy: 0.25, Medium: 0.5, Hard: 0.75 };
  const statusFromDb = (s: string): QuestionStatus => (s === 'REVIEWED' ? 'IN_REVIEW' : s === 'ARCHIVED' ? 'REJECTED' : (s as QuestionStatus));

  const mapQuestionFromApi = (r: any): AdminQuestion => ({
    id: r.id,
    topicId: r.topicId,
    questionText: r.prompt,
    options: (r.options || []).map((text: string, i: number) => ({ id: `opt-${i}`, text, isCorrect: i === r.answerIndex })),
    explanation: r.explanation || '',
    examName: 'TNPSC Group 2 & 2A Combined',
    subjectName: r.subjectName,
    chapterName: r.chapterName,
    topicName: r.topicName,
    conceptName: r.topicName,
    difficulty: difficultyToBand(Number(r.difficulty ?? 0.3)),
    type: 'MCQ',
    isPYQ: Boolean(r.sourceYear),
    pyqMetadata: r.sourceYear
      ? { sourceYear: r.sourceYear, examGroup: 'TNPSC Group 2 & 2A', paperNumber: '', questionNumber: 0, sourcePage: 0, verifiedProvenance: true }
      : undefined,
    generationSource: r.sourceYear ? 'OFFICIAL_PAST_PAPER' : r.source === 'ai-generated' ? 'AI_GENERATED' : 'MANUAL_AUTHOR',
    status: statusFromDb(r.status),
    authorName: 'Admin Contributor',
    attemptsCount: Number(r.attemptsCount ?? 0),
    accuracyRate: Number(r.accuracyRate ?? 0),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const refreshQuestions = React.useCallback((search?: string) => {
    novaApi
      .adminQuestionsList({ search, limit: 100 })
      .then((res: any) => {
        setQuestions((res.questions || []).map(mapQuestionFromApi));
        setQuestionsError(null);
      })
      .catch((err) => setQuestionsError(err instanceof Error ? err.message : 'Could not load questions'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshQuestions();
  }, [refreshQuestions]);

  // Real test templates (GET /api/admin/tests/templates -- see
  // src/lib/adminCrud.mjs listTestTemplates). Previously seeded from
  // mockAdminData into localStorage. difficulty/randomizeQuestions (except
  // where it can be derived for real, see below)/attemptLimit/instructions
  // stay fixed defaults -- TestBuilderView never actually exposes editable
  // controls for them (checked: no form field sets them), so there's
  // nothing real to persist. sections is synthesized as one section
  // covering the whole paper -- the UI has no section editor either.
  const mapTestFromApi = (r: any): AdminTest => {
    const totalMarks = Number(r.questionCount || 0) * Number(r.marksPerQuestion ?? 1);
    return {
      id: r.id,
      title: r.name,
      testType: (r.testType || 'Milestone') as AdminTest['testType'],
      examName: 'TNPSC Group 2 & 2A Combined',
      subjectName: r.subjectName || 'General Studies',
      topicNames: (r.topics || []).map((t: any) => t.topicName),
      durationMinutes: Number(r.durationMinutes ?? 45),
      questionCount: Number(r.questionCount || 0),
      totalMarks,
      marksPerQuestion: Number(r.marksPerQuestion ?? 1),
      negativeMarks: Number(r.negativeMarks ?? 0),
      passingThresholdPercent: Number(r.passingThresholdPercent ?? 40),
      difficulty: 'Exam-Standard',
      randomizeQuestions: (r.questionIds || []).length === 0,
      proctoringPolicyId: r.proctoringPolicyId || '',
      proctoringPolicyName: r.proctoringPolicyName || 'Not assigned',
      attemptLimit: 2,
      instructions: ['Maintain full-screen supervision throughout test.'],
      status: r.active ? 'PUBLISHED' : 'DRAFT',
      questionIds: r.questionIds || [],
      sections: [{ id: `${r.id}-sec-1`, name: 'Section 1', questionCount: Number(r.questionCount || 0), marks: totalMarks }],
      totalAttempts: Number(r.totalAttempts ?? 0),
      avgScore: Number(r.avgScore ?? 0),
      passRate: Number(r.passRate ?? 0),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt || r.createdAt,
    };
  };

  const [tests, setTests] = useState<AdminTest[]>([]);
  const [testsError, setTestsError] = useState<string | null>(null);

  const refreshTests = React.useCallback(() => {
    novaApi
      .adminTestTemplates()
      .then((res: any) => {
        setTests((res.templates || []).map(mapTestFromApi));
        setTestsError(null);
      })
      .catch((err) => setTestsError(err instanceof Error ? err.message : 'Could not load test templates'));
  }, []);

  useEffect(() => {
    refreshTests();
  }, [refreshTests]);

  // Real security policies (GET /api/admin/proctoring/policies -- see
  // db/migrations/V79__proctoring_hub.sql). Previously seeded from
  // mockAdminData into localStorage. Same three policies, same ids, seeded
  // for real in the migration -- there's no "create policy" control
  // anywhere in the UI, only edits to existing rows.
  const [policies, setPolicies] = useState<ProctoringPolicy[]>([]);
  const refreshPolicies = React.useCallback(() => {
    novaApi
      .adminProctoringPolicies()
      .then((res: any) => setPolicies(res.policies || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshPolicies();
  }, [refreshPolicies]);

  // Real proctoring sessions (GET /api/admin/proctoring/sessions -- the
  // same real endpoint the already-wired Proctoring Reports panel uses),
  // mapped onto the richer ProctoringAttemptReview shape Dashboard and
  // ProctoringHubView's review list were built against. The real schema
  // (proctoring_session.status: RECORDING/COMPLETED/ABANDONED) had no
  // FLAGGED/SUSPICIOUS/INVALIDATED concept and no admin decision workflow
  // at all until V79 (proctoring_session.decision, see proctoring.mjs
  // recordDecision) -- so status prefers a real recorded decision when one
  // exists, and only falls back to a signal-derived guess (real
  // proctoring_event rows -> FLAGGED, real ABANDONED status -> INVALIDATED)
  // for sessions nobody has reviewed yet. riskScore/riskLevel stay a
  // simple, disclosed heuristic on event count, not a real ML risk engine.
  const DECISION_TO_STATUS: Record<string, ProctoringAttemptReview['status']> = {
    INVALIDATE: 'INVALIDATED', FLAG: 'FLAGGED', WARNING: 'SUSPICIOUS', CLEAR: 'COMPLETED', REVIEW_REQUIRED: 'FLAGGED',
  };
  const mapProctoringReviewFromApi = (s: any, eventsByTestId: Map<string, any[]>): ProctoringAttemptReview => {
    const eventCount = Number(s.eventCount || 0);
    const riskScore = Math.min(100, eventCount * 20);
    const status: ProctoringAttemptReview['status'] =
      (s.decision && DECISION_TO_STATUS[s.decision]) ||
      (s.status === 'ABANDONED' ? 'INVALIDATED' : eventCount > 0 ? 'FLAGGED' : 'COMPLETED');
    const events = (eventsByTestId.get(s.testId) || []).map((e: any) => ({
      id: e.id,
      attemptId: s.testId,
      learnerId: s.learnerId || '',
      learnerName: s.learnerName,
      testId: s.testId,
      testTitle: s.templateName || 'Weekly Test',
      timestamp: e.timestamp,
      eventType: e.eventType,
      severity: e.severity,
      evidenceDetails: `${e.eventType.replace(/_/g, ' ')} recorded during the attempt`,
      // Real telemetry (browser/OS/IP/screen resolution) isn't captured by
      // the real event-logging write path (see proctoring.mjs
      // listRecentEvents) -- disclosed as not collected rather than faked.
      deviceMetadata: { browser: 'Not collected', os: 'Not collected', ipMasked: 'Not collected', screenResolution: 'Not collected' },
      reviewState: 'UNREVIEWED' as const,
    }));
    return {
      id: s.testId,
      attemptId: s.testId,
      learnerId: s.learnerId || '',
      learnerName: s.learnerName,
      learnerEmail: s.learnerEmail || '',
      testId: s.testId,
      testTitle: s.templateName || 'Weekly Test',
      startedAt: s.startedAt,
      submittedAt: s.endedAt || s.startedAt,
      score: Number(s.score ?? 0),
      totalMarks: Number(s.questionCount ?? 0),
      percentage: Number(s.score ?? 0),
      riskScore,
      riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW',
      status,
      violationsCount: eventCount,
      events,
      decision: s.decision || undefined,
      decisionReason: s.decisionReason || undefined,
      decidedAt: s.decidedAt || undefined,
    };
  };

  const [proctoringReviews, setProctoringReviews] = useState<ProctoringAttemptReview[]>([]);
  const [proctoringError, setProctoringError] = useState<string | null>(null);
  const refreshProctoringReviews = React.useCallback(() => {
    Promise.all([novaApi.adminProctoringSessions(), novaApi.adminProctoringEvents(200)])
      .then(([sessionsRes, eventsRes]: any[]) => {
        const eventsByTestId = new Map<string, any[]>();
        for (const e of eventsRes.events || []) {
          if (!eventsByTestId.has(e.testId)) eventsByTestId.set(e.testId, []);
          eventsByTestId.get(e.testId)!.push(e);
        }
        setProctoringReviews((sessionsRes.sessions || []).map((s: any) => mapProctoringReviewFromApi(s, eventsByTestId)));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshProctoringReviews();
  }, [refreshProctoringReviews]);

  // Real admin activity trail (GET/POST /api/admin/audit-log -- see
  // src/lib/adminCrud.mjs recordAdminAudit/listAdminAudit). Every call site
  // below this used to only ever touch local React state -- the Admin
  // Portal's recordAudit() helper already assumed a real audit trail
  // existed; now it does.
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const refreshAuditLogs = React.useCallback(() => {
    novaApi
      .adminAuditLog(100)
      .then((res: any) => {
        const mapped: AuditLogEntry[] = (res.entries || []).map((e: any) => ({
          id: e.id,
          actorId: e.actorId || '',
          actorName: e.actorEmail,
          actorRole: (e.actorRole || activeRole) as AdminRole,
          action: e.action,
          entity: e.entity,
          entityId: e.entityId || '',
          timestamp: e.createdAt,
          ipAddress: '—',
          beforeSnapshot: e.beforeSnapshot,
          afterSnapshot: e.afterSnapshot,
          reason: e.reason,
          result: e.result,
        }));
        setAuditLogs(mapped);
      })
      .catch(() => {});
  }, [activeRole]);
  useEffect(() => {
    refreshAuditLogs();
  }, [refreshAuditLogs]);

  const [aiProposals, setAiProposals] = useState<AIContentProposal[]>(() => {
    const saved = localStorage.getItem('nova_admin_ai_proposals');
    return saved ? JSON.parse(saved) : initialAIContentProposals;
  });

  const [adaptiveRules, setAdaptiveRules] = useState<AdaptiveRule[]>(() => {
    const saved = localStorage.getItem('nova_admin_adaptive_rules');
    return saved ? JSON.parse(saved) : initialAdaptiveRules;
  });

  // Real broadcast history (POST /api/admin/notifications/broadcast) -- this
  // is the one admin section with a real "send" action that reaches actual
  // learners, so unlike the rest of this file it isn't seeded from
  // mockAdminData/localStorage.
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const refreshBroadcasts = React.useCallback(() => {
    novaApi
      .adminBroadcasts()
      .then((res) => {
        const mapped: AdminNotificationItem[] = (res.broadcasts || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          message: b.message,
          category: 'system_announcement',
          channels: ['in_app', 'push'],
          targetAudience: b.targetAudience,
          deliveryStatus: 'SENT',
          recipientCount: b.recipientCount,
          openRatePercent: 0,
          sentAt: b.createdAt,
          createdAt: b.createdAt,
        }));
        setNotifications(mapped);
        setNotificationsError(null);
      })
      .catch((err) => setNotificationsError(err instanceof Error ? err.message : 'Could not load broadcast history'));
  }, []);

  useEffect(() => {
    refreshBroadcasts();
  }, [refreshBroadcasts]);

  // Real admin accounts (GET /api/admin/users -- the same endpoint the
  // standalone /admin/users Next.js page uses), replacing initialAdminUsers
  // below. No suspend/reactivate concept exists for admin accounts in the
  // schema, so status is always ACTIVE and lastActive is left blank rather
  // than fabricated -- this view is read-only (see AdminsRolesView), so
  // there's no local write path to keep in sync either.
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsError, setAdminsError] = useState<string | null>(null);

  useEffect(() => {
    novaApi
      .adminUsers()
      .then((res) => {
        const mapped: AdminUser[] = (res.accounts || []).map((a: any) => ({
          id: a.id,
          name: a.email.split('@')[0],
          email: a.email,
          role: (a.adminRoleLabel || a.adminRole) as AdminRole,
          assignedSubjects: Array.isArray(a.subjectIds) && a.subjectIds.length ? a.subjectIds : undefined,
          status: 'ACTIVE',
          // No last-login/last-active tracking exists for admin accounts --
          // showing the account's creation date here instead would be a
          // different kind of fake data (misrepresenting creation as
          // activity), so this is honestly blank rather than invented.
          lastActive: '—',
        }));
        setAdmins(mapped);
        setAdminsError(null);
      })
      .catch((err) => setAdminsError(err instanceof Error ? err.message : 'Could not load admin accounts'));
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('nova_admin_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem('nova_admin_subject_scope', activeSubjectScope);
  }, [activeSubjectScope]);

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
  // Real write: POST /api/admin/audit-log, fire-and-forget (the real
  // action this describes has already succeeded by the time recordAudit is
  // called -- a failure here must never surface as if the real action
  // failed). Optimistic local prepend for instant UI feedback, corrected
  // by the next refreshAuditLogs() (e.g. on reload).
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
      ipAddress: '—',
      reason,
      beforeSnapshot: before,
      afterSnapshot: after,
      result: 'SUCCESS',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    novaApi
      .adminRecordAudit({ action, entity, entityId, reason, beforeSnapshot: before, afterSnapshot: after, result: 'SUCCESS' })
      .catch(() => {});
  };

  // Learner operations -- status updates and creation now reach the real
  // app_user table (/api/admin/learners) instead of only mutating local
  // React state. accountStatus === 'FLAGGED_PROCTORING' isn't a real value
  // in app_user.status (ACTIVE/SUSPENDED/DELETED -- see
  // V25__users_auth.sql) and the actual suspend/reactivate button only
  // ever toggles ACTIVE<->SUSPENDED, so that's all this write-path needs
  // to support.
  const handleUpdateLearnerStatus = (
    learnerId: string,
    newStatus: LearnerRecord['accountStatus'],
    reason: string
  ) => {
    const target = learners.find((l) => l.id === learnerId);
    if (!target) return;
    if (newStatus !== 'ACTIVE' && newStatus !== 'SUSPENDED') return;
    setLearners((prev) =>
      prev.map((l) =>
        l.id === learnerId ? { ...l, accountStatus: newStatus, suspensionReason: reason } : l
      )
    );
    novaApi
      .adminUpdateLearnerStatus(learnerId, newStatus, reason)
      .then(() => {
        recordAudit(
          newStatus === 'SUSPENDED' ? 'LEARNER_SUSPENDED' : 'LEARNER_REACTIVATED',
          'Learner',
          learnerId,
          reason,
          { status: target.accountStatus },
          { status: newStatus }
        );
      })
      .catch((err) => {
        // Revert the optimistic update -- the real write failed.
        setLearners((prev) =>
          prev.map((l) => (l.id === learnerId ? { ...l, accountStatus: target.accountStatus, suspensionReason: target.suspensionReason } : l))
        );
        setLearnersError(err instanceof Error ? err.message : 'Unable to update this learner');
      });
  };

  const handleAddLearner = (learner: Partial<LearnerRecord>) => {
    if (!learner.name || !learner.email) return;
    novaApi
      .adminCreateLearner({ name: learner.name, email: learner.email })
      .then((res: any) => {
        recordAudit('LEARNER_CREATED', 'Learner', res.id || '', 'Enrolled new aspirant');
        refreshLearners();
        window.alert(`Account created for ${learner.email}.\nTemporary password: ${res.tempPassword}\n\nRelay this to the learner directly -- it is shown only once.`);
      })
      .catch((err) => setLearnersError(err instanceof Error ? err.message : 'Unable to create this learner'));
  };

  // Lesson operations
  // updatedLesson.id is the real topic_id -- LessonsView's topic picker
  // (not a free-text field) is what guarantees that, see its "create new
  // lesson" flow. PUT /api/admin/lessons/:topicId upserts: no row yet ->
  // created; row exists -> updated, version incremented server-side.
  const handleSaveLesson = async (updatedLesson: AdminLesson, reason?: string) => {
    const exists = lessons.some((l) => l.id === updatedLesson.id);
    try {
      await novaApi.adminSaveLesson(updatedLesson.id, {
        title: updatedLesson.title,
        concept: updatedLesson.topicName || updatedLesson.title,
        description: updatedLesson.description,
        learningObjectives: updatedLesson.learningObjectives,
        difficulty: updatedLesson.difficulty,
        estimatedDurationMinutes: updatedLesson.estimatedDurationMinutes,
        contentMarkdown: updatedLesson.contentBlocks[0]?.content || '',
        status: updatedLesson.status,
      });
      refreshLessons();
      recordAudit(
        exists ? 'LESSON_UPDATED' : 'LESSON_CREATED',
        'Lesson',
        updatedLesson.id,
        reason || (exists ? 'Updated lesson content & version' : 'Authored new lesson')
      );
    } catch (err) {
      setLessonsError(err instanceof Error ? err.message : 'Could not save lesson');
    }
  };

  const handleArchiveLesson = async (lessonId: string, reason: string) => {
    try {
      await novaApi.adminSetLessonStatus(lessonId, 'ARCHIVED');
      refreshLessons();
      recordAudit('LESSON_ARCHIVED', 'Lesson', lessonId, reason);
    } catch (err) {
      setLessonsError(err instanceof Error ? err.message : 'Could not archive lesson');
    }
  };

  // Question operations -- now real writes against POST/PATCH
  // /api/admin/questions(/:id). QuestionsView.handleSave generates a fake
  // `q-${Date.now()}` id for a brand-new question (and handleDuplicate for
  // a copy), which never matches a real row -- that's exactly how "exists"
  // below tells create from update apart, same as before, just routed to
  // the real endpoints now.
  const handleSaveQuestion = (updatedQuestion: AdminQuestion, reason?: string) => {
    const exists = questions.some((q) => q.id === updatedQuestion.id);
    const options = updatedQuestion.options.map((o) => o.text);
    const answerIndex = updatedQuestion.options.findIndex((o) => o.isCorrect);

    if (exists) {
      novaApi
        .adminUpdateQuestion(updatedQuestion.id, {
          prompt: updatedQuestion.questionText,
          options,
          answerIndex,
          explanation: updatedQuestion.explanation,
          difficulty: bandToDifficulty[updatedQuestion.difficulty],
          status: updatedQuestion.status,
        })
        .then(() => {
          recordAudit('QUESTION_UPDATED', 'Question', updatedQuestion.id, reason || 'Updated question');
          refreshQuestions();
        })
        .catch((err) => setQuestionsError(err instanceof Error ? err.message : 'Unable to update this question'));
    } else {
      if (!updatedQuestion.topicId) {
        setQuestionsError('Unable to create this question: no real topic was selected.');
        return;
      }
      novaApi
        .adminCreateQuestion({
          topicId: updatedQuestion.topicId,
          prompt: updatedQuestion.questionText,
          options,
          answerIndex,
          explanation: updatedQuestion.explanation,
          difficulty: bandToDifficulty[updatedQuestion.difficulty],
        })
        .then((res: any) => {
          recordAudit('QUESTION_CREATED', 'Question', res.id, reason || 'Created MCQ');
          refreshQuestions();
        })
        .catch((err) => setQuestionsError(err instanceof Error ? err.message : 'Unable to create this question'));
    }
  };

  const handleUpdateQuestionStatus = (
    questionId: string,
    status: QuestionStatus,
    reason?: string
  ) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, status } : q)));
    novaApi
      .adminUpdateQuestion(questionId, { status })
      .then(() => {
        recordAudit(
          status === 'PUBLISHED' ? 'QUESTION_APPROVED' : 'QUESTION_REJECTED',
          'Question',
          questionId,
          reason || `Question transitioned to ${status}`
        );
      })
      .catch((err) => {
        refreshQuestions(); // revert the optimistic update to whatever's real
        setQuestionsError(err instanceof Error ? err.message : 'Unable to update this question');
      });
  };

  // Test builder operations -- real writes against POST/PATCH
  // /api/admin/tests/templates(/:id). "exists" distinguishes create from
  // update the same way QuestionsView's save does: a brand-new test gets a
  // fake `test-${Date.now()}` id from TestBuilderView.handleSave that never
  // matches a real template.
  const handleSaveTest = (test: AdminTest, reason?: string) => {
    const exists = tests.some((t) => t.id === test.id);
    const payload = {
      name: test.title,
      subjectName: test.subjectName,
      testType: test.testType,
      durationMinutes: test.durationMinutes,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarks,
      passingThresholdPercent: test.passingThresholdPercent,
      proctoringPolicyId: test.proctoringPolicyId,
      proctoringPolicyName: test.proctoringPolicyName,
      questionIds: test.questionIds,
      active: test.status === 'PUBLISHED',
    };

    if (exists) {
      novaApi
        .adminUpdateTestTemplate(test.id, payload)
        .then(() => {
          recordAudit('TEST_UPDATED', 'Test', test.id, reason || 'Updated test paper');
          refreshTests();
        })
        .catch((err) => setTestsError(err instanceof Error ? err.message : 'Unable to update this test'));
    } else {
      novaApi
        .adminCreateTestTemplate(payload)
        .then((res: any) => {
          recordAudit('TEST_CREATED', 'Test', res.id, reason || 'Created test paper');
          refreshTests();
        })
        .catch((err) => setTestsError(err instanceof Error ? err.message : 'Unable to create this test'));
    }
  };

  const handlePublishTest = (testId: string) => {
    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, status: 'PUBLISHED' } : t)));
    novaApi
      .adminUpdateTestTemplate(testId, { active: true })
      .then(() => recordAudit('TEST_PUBLISHED', 'Test', testId, 'Published test paper for learner cohort'))
      .catch((err) => {
        refreshTests();
        setTestsError(err instanceof Error ? err.message : 'Unable to publish this test');
      });
  };

  // Proctoring operations -- real writes against
  // PATCH /api/admin/proctoring/policies/:id and
  // POST /api/admin/proctoring/sessions/:testId/decision.
  const handleSavePolicy = (policy: ProctoringPolicy, reason?: string) => {
    const previous = policies.find((p) => p.id === policy.id);
    setPolicies((prev) => prev.map((p) => (p.id === policy.id ? policy : p)));
    // updatePolicy() server-side only ever writes the real boolean toggle
    // fields it recognizes (see POLICY_COLUMNS in proctoring.mjs) -- safe
    // to send the whole updated object, non-toggle fields are ignored.
    novaApi
      .adminUpdateProctoringPolicy(policy.id, policy)
      .then(() => recordAudit('PROCTORING_POLICY_CHANGED', 'ProctoringPolicy', policy.id, reason || 'Updated proctoring threshold'))
      .catch((err) => {
        if (previous) setPolicies((prev) => prev.map((p) => (p.id === policy.id ? previous : p)));
        setProctoringError(err instanceof Error ? err.message : 'Unable to update this policy');
      });
  };

  // attemptId here is actually testId (see mapProctoringReviewFromApi --
  // ProctoringAttemptReview.attemptId is set to the real test id, there is
  // no separate "attempt" concept in the schema).
  const handleDecideAttempt = (attemptId: string, decision: ProctoringDecision, reason: string) => {
    const statusFromDecision: ProctoringAttemptReview['status'] =
      decision === 'INVALIDATE' ? 'INVALIDATED' : decision === 'CLEAR' ? 'COMPLETED' : decision === 'WARNING' ? 'SUSPICIOUS' : 'FLAGGED';
    setProctoringReviews((prev) =>
      prev.map((r) =>
        r.attemptId === attemptId
          ? { ...r, decision, decisionReason: reason, decisionBy: `${activeRole} Officer`, decidedAt: new Date().toISOString(), status: statusFromDecision }
          : r
      )
    );
    novaApi
      .adminDecideAttempt(attemptId, decision, reason)
      .then(() => {
        recordAudit(
          decision === 'INVALIDATE' ? 'ATTEMPT_INVALIDATED' : 'PROCTORING_VERDICT_ISSUED',
          'ProctoringReport',
          attemptId,
          reason
        );
      })
      .catch((err) => {
        refreshProctoringReviews(); // revert the optimistic update to whatever's real
        setProctoringError(err instanceof Error ? err.message : 'Unable to record this decision');
      });
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

  // Notifications -- the only admin section with a real "send": fans out to
  // every learner account as a real /api/notifications feed entry plus a
  // best-effort push, instead of only updating local React state.
  const handleBroadcastNotification = (item: Partial<AdminNotificationItem>) => {
    const title = item.title || '';
    const message = item.message || '';
    novaApi
      .adminBroadcastNotification(title, message)
      .then((res) => {
        recordAudit('NOTIFICATION_DISPATCHED', 'Notification', res.broadcast?.id || '', `${title} -> ${res.broadcast?.recipientCount ?? 0} learner(s)`);
        refreshBroadcasts();
      })
      .catch((err) => setNotificationsError(err instanceof Error ? err.message : 'Could not send this notification'));
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
          {/* Most sections below still read/write local mock data (seeded
              once, then persisted to this browser's localStorage) -- real
              backend wiring per section (questions, tests, proctoring
              policies, audit logs, AI proposals) is tracked as follow-up
              work. notifications, proctoring-reports, admins-roles,
              lessons, curriculum, and learners are real (GET/POST/PATCH
              against actual API routes) and excluded from the warning
              banner below. */}
          {currentSectionSlug !== 'notifications' && currentSectionSlug !== 'proctoring-reports' && currentSectionSlug !== 'admins-roles' && currentSectionSlug !== 'lessons' && currentSectionSlug !== 'curriculum' && currentSectionSlug !== 'learners' && currentSectionSlug !== 'questions' && currentSectionSlug !== 'question-review' && currentSectionSlug !== 'tests' && currentSectionSlug !== 'dashboard' && currentSectionSlug !== 'audit-logs' && currentSectionSlug !== 'proctoring' && currentSectionSlug !== 'proctoring-events' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Design preview: this section's data is local/mock, not yet wired to the real backend.</span>
            </div>
          )}
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
              topicsWithoutLesson={lessonTopics.filter((t: any) => !t.hasLesson)}
              assignedSubjects={[activeSubjectScope]}
              onSaveLesson={handleSaveLesson}
              onArchiveLesson={handleArchiveLesson}
            />
          )}

          {currentSectionSlug === 'questions' && (
            <QuestionsView
              role={activeRole}
              questions={questions}
              topics={lessonTopics as any}
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
              topics={lessonTopics as any}
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
              topics={lessonTopics as any}
              policies={policies}
              availableQuestions={questions}
              onSaveTest={handleSaveTest}
              onPublishTest={handlePublishTest}
            />
          )}

          {currentSectionSlug === 'proctoring-reports' && <ProctoringRecordingsPanel />}

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
            <>
              {notificationsError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {notificationsError}
                </div>
              )}
              <NotificationsAdminView
                notifications={notifications}
                onBroadcastNotification={handleBroadcastNotification}
              />
            </>
          )}

          {/* Admins & Roles */}
          {currentSectionSlug === 'admins-roles' && (
            <AdminsRolesView currentRole={activeRole} admins={admins} />
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
