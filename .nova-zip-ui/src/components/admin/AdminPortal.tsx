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
  initialLearnersList,
  initialAdminResources,
  initialAdminPYQs,
  initialProctoringPolicies,
  initialProctoringReviews,
  initialAdaptiveRules,
  initialAdminMilestones,
  initialAuditLogs,
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

function mapAdminQuestion(row: any): AdminQuestion {
  const answerIndex = Number(row.answerIndex ?? -1);
  const rawOptions = Array.isArray(row.options) ? row.options : [];
  const options = rawOptions.map((option: any, index: number) => ({
    id: `${row.id}-option-${index + 1}`,
    text: typeof option === 'string' ? option : String(option?.text ?? ''),
    isCorrect: index === answerIndex,
  }));
  const rawStatus = String(row.status || 'DRAFT').toUpperCase();
  const status: QuestionStatus = rawStatus === 'APPROVED' ? 'PUBLISHED' : rawStatus as QuestionStatus;
  const generation = String(row.generationSource || 'manual').toLowerCase();
  const isPYQ = generation === 'pyq' || row.sourceYear != null || row.examCode != null || row.examGroup != null || row.paper != null;
  const difficultyValue = Number(row.difficulty ?? 0.5);
  const difficulty: AdminQuestion['difficulty'] = difficultyValue < 0.34 ? 'Easy' : difficultyValue < 0.67 ? 'Medium' : 'Hard';
  return {
    id: row.id,
    topicId: row.topicId,
    questionText: row.prompt || '',
    options,
    explanation: row.explanation || '',
    examName: 'TNPSC Group 2 & 2A',
    subjectName: row.subjectName || '—',
    chapterName: row.chapterName || '—',
    topicName: row.topicName || '—',
    conceptName: row.topicName || '—',
    difficulty,
    type: 'MCQ',
    isPYQ,
    pyqMetadata: isPYQ ? {
      sourceYear: Number(row.sourceYear || 0),
      examGroup: row.examGroup || 'TNPSC',
      paperNumber: String(row.paper || row.examCode || '—'),
      questionNumber: Number(row.questionNumber || 0),
      sourcePage: Number(row.sourcePage || 0),
      verifiedProvenance: row.sourceYear != null && row.questionNumber != null && row.sourcePage != null,
    } : undefined,
    generationSource: generation === 'pyq' ? 'OFFICIAL_PAST_PAPER' : generation === 'ai' ? 'AI_GENERATED' : generation === 'pdf' ? 'PDF_EXTRACTED' : generation === 'template' ? 'TEMPLATE_GENERATED' : 'MANUAL_AUTHOR',
    status,
    authorName: '—',
    attemptsCount: null,
    accuracyRate: null,
    createdAt: row.createdAt || row.updatedAt || new Date(0).toISOString(),
    updatedAt: row.updatedAt || row.createdAt || new Date(0).toISOString(),
  };
}

interface AdminPortalProps {
  onReturnToLearnerHub: () => void;
  // Derived from the server-authenticated admin_role; never client-selectable.
  initialRole: AdminRole;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnToLearnerHub, initialRole }) => {
  // Display the authenticated backend role. Client-side role simulation is
  // intentionally disabled; every sensitive operation is authorised server-side.
  const activeRole = initialRole;

  const [currentSectionSlug, setCurrentSectionSlug] = useState<string>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Core Persistent Administrative State
  const [learners, setLearners] = useState<LearnerRecord[]>(() => {
    const saved = localStorage.getItem('nova_admin_learners');
    return saved ? JSON.parse(saved) : initialLearnersList;
  });

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
  const allowedLessonSubjects = [...new Set(lessonTopics.map((topic: any) => topic.subjectName).filter(Boolean))];
  useEffect(() => {
    novaApi.adminLessons().then((res) => setLessonTopics(res.topics || [])).catch(() => {});
  }, [lessons.length]);

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [questionTopics, setQuestionTopics] = useState<any[]>([]);
  const allowedQuestionSubjects = [...new Set(questionTopics.map((topic: any) => topic.subjectName).filter(Boolean))];
  const activeSubjectScope = [...new Set([...allowedQuestionSubjects, ...allowedLessonSubjects])].join(', ') || 'No subject scope assigned';
  const [selectedQuestionTopicId, setSelectedQuestionTopicId] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const refreshQuestions = React.useCallback(async (topicId: string) => {
    if (!topicId) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const result = await novaApi.adminQuestions(topicId);
      setQuestions((result.questions || []).map(mapAdminQuestion));
      setQuestionsError(null);
    } catch (error) {
      setQuestionsError(error instanceof Error ? error.message : 'Could not load questions');
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    novaApi.adminTopics()
      .then((result) => {
        const topics = result.topics || [];
        setQuestionTopics(topics);
        setSelectedQuestionTopicId((current) => current || topics[0]?.topicId || '');
        if (!topics.length) setQuestionsError('No syllabus topics are available for this admin role.');
      })
      .catch((error) => setQuestionsError(error instanceof Error ? error.message : 'Could not load syllabus topics'));
  }, []);

  useEffect(() => {
    if (selectedQuestionTopicId) refreshQuestions(selectedQuestionTopicId);
  }, [selectedQuestionTopicId, refreshQuestions]);

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
    localStorage.setItem('nova_admin_learners', JSON.stringify(learners));
  }, [learners]);


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

  // Question bank operations use the scoped, server-authorised question APIs.
  const handleSaveQuestion = async (updatedQuestion: AdminQuestion, reason?: string) => {
    const exists = questions.some((question) => question.id === updatedQuestion.id);
    const correctIndex = updatedQuestion.options.findIndex((option) => option.isCorrect);
    if (correctIndex < 0) throw new Error('Select exactly one correct answer option.');
    const payload = {
      topicId: updatedQuestion.topicId || selectedQuestionTopicId,
      prompt: updatedQuestion.questionText,
      options: updatedQuestion.options.map((option) => option.text),
      answerIndex: correctIndex,
      explanation: updatedQuestion.explanation,
      difficulty: updatedQuestion.difficulty === 'Easy' ? 0.2 : updatedQuestion.difficulty === 'Hard' ? 0.8 : 0.5,
      estimatedSeconds: 45,
      status: updatedQuestion.status,
    };
    if (!payload.topicId) throw new Error('Choose a syllabus topic before saving.');
    if (exists) await novaApi.adminUpdateQuestion(updatedQuestion.id, payload);
    else await novaApi.adminCreateQuestion(payload);
    await refreshQuestions(payload.topicId);
  };

  const handleUpdateQuestionStatus = async (
    questionId: string,
    status: QuestionStatus,
    reason?: string
  ) => {
    await novaApi.adminUpdateQuestion(questionId, { status });
    await refreshQuestions(selectedQuestionTopicId);
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

  // Visible sections are derived from the server-authenticated role.
  // The Content Engine lives in the Next.js admin workspace, so provide a
  // deliberate bridge for roles authorised to generate/review its packages.
  const visibleSections = [
    ...getVisibleSectionsForRole(activeRole).filter((section) => activeRole !== 'ANALYTICS_ADMIN' || ['dashboard', 'analytics'].includes(section.slug)),
    ...(['CONTENT_ADMIN', 'CONTENT_REVIEWER', 'QUESTION_BANK_ADMIN', 'AI_QUALITY_ADMIN'].includes(activeRole)
      ? [{ id: 34, slug: 'content-engine', title: 'AI Content Engine', category: 'Questions' as const, icon: 'Sparkles', requiredEntity: 'Question' as const }]
      : []),
  ];
  useEffect(() => {
    if (visibleSections.length && !visibleSections.some((section) => section.slug === currentSectionSlug)) {
      setCurrentSectionSlug(visibleSections[0].slug);
    }
  }, [activeRole, currentSectionSlug]);

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

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Authenticated role indicator — not a client-side role switcher. */}
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Signed-in role</span>
          <strong className="text-xs text-orange-700 dark:text-orange-300">{activeRole}</strong>
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
                  ? 'Full governance. Server-side authorization remains authoritative.'
                  : activeRole === 'SUBJECT_ADMIN'
                  ? `Server-authorized subject scope: ${activeSubjectScope}.`
                  : activeRole === 'QUESTION_REVIEWER'
                  ? 'Question review access. Publishing remains restricted.'
                  : activeRole === 'QUESTION_BANK_ADMIN'
                  ? 'Question authoring, review and publish permissions.'
                  : activeRole === 'CONTENT_ADMIN'
                  ? 'Curriculum and content operations; question review uses the Content Engine.'
                  : activeRole === 'CONTENT_REVIEWER'
                  ? 'Read and update curriculum content; final review decisions are recorded in the review queue.'
                  : activeRole === 'AI_QUALITY_ADMIN'
                  ? 'AI generation quality and human review workflow.'
                  : activeRole === 'AUDITOR'
                  ? 'Read-only access to audit and content records.'
                  : activeRole === 'ANALYTICS_ADMIN'
                  ? 'Read-only analytics and progress reporting.'
                  : activeRole === 'SUPPORT'
                  ? 'Support access; learner roster mutations are not enabled here.'
                  : activeRole === 'UNASSIGNED_ADMIN'
                  ? 'No admin role assigned. Contact a Super Admin for access.'
                  : 'Platform administration governed by server permissions.'}
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
          {/* Live backend-backed sections are excluded from the design-preview warning. */}
          {currentSectionSlug !== 'notifications' && currentSectionSlug !== 'proctoring-reports' && currentSectionSlug !== 'admins-roles' && currentSectionSlug !== 'lessons' && currentSectionSlug !== 'curriculum' && currentSectionSlug !== 'learners' && currentSectionSlug !== 'questions' && currentSectionSlug !== 'question-review' && currentSectionSlug !== 'content-engine' && currentSectionSlug !== 'tests' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Design preview: this section's data is local/mock, not yet wired to the real backend.</span>
            </div>
          )}
          {visibleSections.length === 0 && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
              <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
              <h2 className="mt-3 text-base font-bold text-amber-900 dark:text-amber-200">Admin role not assigned</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-amber-800 dark:text-amber-300">This account has no recognised admin role or permissions. Ask a Super Admin to assign the correct role. No client-side role switching is available.</p>
            </div>
          )}
          {/* SECTION ROUTING */}
          {visibleSections.some((section) => section.slug === 'dashboard') && currentSectionSlug === 'dashboard' && (
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
              assignedSubjects={allowedLessonSubjects}
              onSaveLesson={handleSaveLesson}
              onArchiveLesson={handleArchiveLesson}
            />
          )}

          {currentSectionSlug === 'questions' && (
            <QuestionsView
              role={activeRole}
              questions={questions}
              topics={questionTopics}
              selectedTopicId={selectedQuestionTopicId}
              onTopicChange={setSelectedQuestionTopicId}
              isLoading={questionsLoading}
              loadError={questionsError}
              assignedSubjects={allowedQuestionSubjects}
              isReviewQueueMode={false}
              onSaveQuestion={handleSaveQuestion}
              onUpdateStatus={handleUpdateQuestionStatus}
            />
          )}

          {currentSectionSlug === 'question-review' && (
            <QuestionsView
              role={activeRole}
              questions={questions}
              topics={questionTopics}
              selectedTopicId={selectedQuestionTopicId}
              onTopicChange={setSelectedQuestionTopicId}
              isLoading={questionsLoading}
              loadError={questionsError}
              assignedSubjects={allowedQuestionSubjects}
              isReviewQueueMode={true}
              onSaveQuestion={handleSaveQuestion}
              onUpdateStatus={handleUpdateQuestionStatus}
            />
          )}

          {currentSectionSlug === 'content-engine' && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <Sparkles className="h-7 w-7 text-purple-600" />
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">AI Content Engine</h2>
                  <p className="mt-1 text-xs text-neutral-500">Source-grounded lesson and MCQ generation, provenance checks, and human approval.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {activeRole !== 'CONTENT_REVIEWER' && <a href="/admin/content-engine" className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700">Open Content Engine</a>}
                {activeRole !== 'QUESTION_BANK_ADMIN' && <a href="/admin/review" className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200">Open Review Queue</a>}
              </div>
              <p className="mt-4 text-[11px] text-neutral-500">The destination pages enforce their own server-side role and subject permissions. A link being visible here does not grant access to the destination.</p>
            </div>
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
                Authenticated role <strong>{activeRole}</strong>. Server-side permissions control sensitive actions; sections marked design preview are not persisted.
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
