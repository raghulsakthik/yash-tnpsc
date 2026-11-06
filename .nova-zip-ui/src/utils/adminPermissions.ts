import {
  AdminRole,
  AdminEntity,
  AdminAction,
  AdminLesson,
  AdminQuestion,
  AdminTest,
  ProctoringDecision,
} from '../types/admin';

/**
 * Section 3: CRUD Permission Matrix Evaluation
 * Legend: C Create, R Read, U Update, D Delete/Archive, P Publish/Approve, V Review
 */
export function mapSessionAdminRole(session: { role?: string; adminRole?: string | null } | null | undefined): AdminRole {
  if (session?.role === 'SUPER_ADMIN' || session?.adminRole === 'super_admin') return 'SUPER_ADMIN';
  const map: Record<string, AdminRole> = {
    platform_admin: 'ADMIN',
    content_admin: 'CONTENT_ADMIN',
    content_reviewer: 'CONTENT_REVIEWER',
    question_bank_admin: 'QUESTION_BANK_ADMIN',
    subject_expert: 'SUBJECT_ADMIN',
    question_reviewer: 'QUESTION_REVIEWER',
    ai_quality_admin: 'AI_QUALITY_ADMIN',
    student_support_admin: 'SUPPORT',
    analytics_admin: 'ANALYTICS_ADMIN',
    auditor: 'AUDITOR',
  };
  return map[session?.adminRole || ''] || 'UNASSIGNED_ADMIN';
}

export function checkPermission(
  role: AdminRole,
  entity: AdminEntity,
  action: AdminAction,
  options?: {
    assignedSubjects?: string[];
    entitySubject?: string;
    isSuperAdminTarget?: boolean;
  }
): { allowed: boolean; reason?: string } {
  if (role === 'SUPER_ADMIN') return { allowed: true };
  if (role === 'UNASSIGNED_ADMIN') return { allowed: false, reason: 'No admin role is assigned to this account. Ask a Super Admin to assign an RBAC role.' };
  if (entity === 'Admin') return { allowed: false, reason: 'Only SUPER_ADMIN can manage administrative credentials and roles.' };

  if (role === 'ADMIN') {
    if (entity === 'Learner' && action === 'DELETE') return { allowed: false, reason: 'Learner accounts must be suspended or archived, not hard-deleted.' };
    return { allowed: true };
  }

  if (role === 'QUESTION_BANK_ADMIN') {
    if (entity === 'Question' || entity === 'PYQ') return { allowed: true };
    return { allowed: false, reason: 'Question Bank Admin is limited to syllabus questions and PYQ management.' };
  }

  if (role === 'AUDITOR') {
    const readable = ['AuditLog','Question','PYQ','Lesson','Resource','Subject','Chapter','Topic','Concept'];
    return { allowed: action === 'READ' && readable.includes(entity), reason: 'Auditor access is read-only.' };
  }

  if (role === 'ANALYTICS_ADMIN') {
    return { allowed: entity === 'Subject' && action === 'READ', reason: 'Analytics Admin has read-only analytics access.' };
  }

  if (role === 'AI_QUALITY_ADMIN') {
    return { allowed: false, reason: 'AI quality review is performed in the Content Engine review queue, not this local admin simulator.' };
  }

  if (role === 'SUBJECT_ADMIN' && options?.entitySubject && options?.assignedSubjects) {
    const isAssigned = options.assignedSubjects.some((subject) => subject.toLowerCase() === options.entitySubject?.toLowerCase());
    if (!isAssigned) return { allowed: false, reason: `Subject scope violation: not assigned to '${options.entitySubject}'.` };
  }

  if (entity === 'Learner') {
    return { allowed: false, reason: 'Learner roster actions are not available to this role in the current admin portal.' };
  }

  if (entity === 'Question' || entity === 'PYQ') {
    if (role === 'CONTENT_ADMIN') return { allowed: false, reason: 'Content Admin uses the Content Engine review queue; question bank listing requires QUESTION_READ.' };
    if (role === 'SUBJECT_ADMIN') return { allowed: ['READ','CREATE','UPDATE'].includes(action), reason: 'Subject Experts cannot publish, reject, or delete questions.' };
    if (role === 'QUESTION_REVIEWER') return { allowed: ['READ','UPDATE','REVIEW','REJECT'].includes(action), reason: 'Question Reviewer cannot publish or delete questions.' };
    if (role === 'SUPPORT') return { allowed: ['READ','UPDATE'].includes(action), reason: 'Support can inspect and correct reported question issues only.' };
    return { allowed: false, reason: `${role} has no question-bank permission.` };
  }

  if (entity === 'Lesson' || entity === 'Resource' || entity === 'Chapter' || entity === 'Topic' || entity === 'Concept' || entity === 'Subject') {
    if (role === 'CONTENT_ADMIN') return { allowed: true };
    if (role === 'CONTENT_REVIEWER') return { allowed: ['READ','UPDATE','REVIEW'].includes(action) };
    if (role === 'SUBJECT_ADMIN') {
      if (entity === 'Subject') return { allowed: action === 'READ' };
      if (entity === 'Topic') return { allowed: ['READ','UPDATE'].includes(action) };
      return { allowed: ['READ','CREATE','UPDATE'].includes(action) };
    }
    return { allowed: false, reason: `${role} does not have curriculum/content access.` };
  }

  if (entity === 'Test' || entity === 'TestAttempt') {
    return { allowed: false, reason: 'Test management is restricted to Platform Admin.' };
  }

  if (entity === 'ProctoringPolicy' || entity === 'ProctoringEvent' || entity === 'ProctoringReport') {
    return { allowed: false, reason: 'Proctoring operations are restricted to Platform Admin.' };
  }

  if (entity === 'AdaptiveRule') {
    return { allowed: false, reason: 'Adaptive rules are read-only for analytics and auditors, and editable by Platform Admin.' };
  }

  if (entity === 'Notification') {
    return { allowed: false, reason: 'Notification authoring is restricted to Platform Admin.' };
  }

  if (entity === 'AuditLog') {
    return { allowed: false, reason: 'Audit logs are immutable and restricted to auditors.' };
  }

  if (entity === 'Milestone') return { allowed: false, reason: 'Milestone reporting is read-only for analytics and auditors.' };
  return { allowed: false, reason: 'No permission is configured for this role and entity.' };
}

/**
 * Filter 33 Navigation Sections based on Role Permissions
 */
export interface AdminNavSection {
  id: number;
  slug: string;
  title: string;
  category: 'Core' | 'Curriculum' | 'Questions' | 'Assessments' | 'Adaptive' | 'Governance';
  icon: string;
  badge?: string;
  requiredEntity: AdminEntity;
}

export const ALL_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  // 1-3 Core
  { id: 1, slug: 'dashboard', title: 'Dashboard', category: 'Core', icon: 'LayoutDashboard', requiredEntity: 'Subject' },
  { id: 2, slug: 'learners', title: 'Learners', category: 'Core', icon: 'GraduationCap', requiredEntity: 'Learner' },
  { id: 3, slug: 'admins-roles', title: 'Admins & Roles', category: 'Core', icon: 'ShieldAlert', requiredEntity: 'Admin', badge: 'Super Only' },

  // 4-13 Curriculum & Content
  { id: 4, slug: 'exams', title: 'Exams', category: 'Curriculum', icon: 'Target', requiredEntity: 'Exam' },
  { id: 5, slug: 'subjects', title: 'Subjects', category: 'Curriculum', icon: 'BookMarked', requiredEntity: 'Subject' },
  { id: 6, slug: 'curriculum', title: 'Curriculum Tree', category: 'Curriculum', icon: 'Layers', requiredEntity: 'Chapter' },
  { id: 7, slug: 'phases', title: 'Phases', category: 'Curriculum', icon: 'Milestone', requiredEntity: 'Chapter' },
  { id: 8, slug: 'weeks', title: 'Weeks', category: 'Curriculum', icon: 'CalendarDays', requiredEntity: 'Chapter' },
  { id: 9, slug: 'days', title: 'Days', category: 'Curriculum', icon: 'Calendar', requiredEntity: 'Chapter' },
  { id: 10, slug: 'topics', title: 'Topics', category: 'Curriculum', icon: 'ListTree', requiredEntity: 'Topic' },
  { id: 11, slug: 'concepts', title: 'Concepts', category: 'Curriculum', icon: 'Lightbulb', requiredEntity: 'Concept' },
  { id: 12, slug: 'lessons', title: 'Lessons', category: 'Curriculum', icon: 'BookOpen', requiredEntity: 'Lesson' },
  { id: 13, slug: 'lesson-resources', title: 'Lesson Resources', category: 'Curriculum', icon: 'Paperclip', requiredEntity: 'Resource' },

  // 14-18 Questions & Review
  { id: 14, slug: 'questions', title: 'Questions', category: 'Questions', icon: 'HelpCircle', requiredEntity: 'Question' },
  { id: 15, slug: 'pyqs', title: 'PYQs (2022-24)', category: 'Questions', icon: 'FileArchive', requiredEntity: 'PYQ' },
  { id: 16, slug: 'question-review', title: 'Question Review', category: 'Questions', icon: 'CheckCheck', requiredEntity: 'Question', badge: 'Review' },
  { id: 17, slug: 'content-upload', title: 'Content Upload', category: 'Questions', icon: 'UploadCloud', requiredEntity: 'Resource' },
  { id: 18, slug: 'ai-content-review', title: 'AI Content Review', category: 'Questions', icon: 'Sparkles', requiredEntity: 'Question', badge: 'AI Engine' },

  // 19-25 Assessments & Proctoring
  { id: 19, slug: 'tests', title: 'Tests & Mock Builder', category: 'Assessments', icon: 'FileText', requiredEntity: 'Test' },
  { id: 20, slug: 'test-sections', title: 'Test Sections', category: 'Assessments', icon: 'Columns', requiredEntity: 'Test' },
  { id: 21, slug: 'test-questions', title: 'Test Questions', category: 'Assessments', icon: 'CheckSquare', requiredEntity: 'Test' },
  { id: 22, slug: 'test-attempts', title: 'Test Attempts', category: 'Assessments', icon: 'UserCheck', requiredEntity: 'TestAttempt' },
  { id: 23, slug: 'proctoring', title: 'Proctoring Policies', category: 'Assessments', icon: 'Eye', requiredEntity: 'ProctoringPolicy' },
  { id: 24, slug: 'proctoring-events', title: 'Proctoring Events', category: 'Assessments', icon: 'AlertTriangle', requiredEntity: 'ProctoringEvent', badge: 'Live Feed' },
  { id: 25, slug: 'proctoring-reports', title: 'Proctoring Reports', category: 'Assessments', icon: 'ShieldCheck', requiredEntity: 'ProctoringReport' },

  // 26-30 Adaptive & Milestones
  { id: 26, slug: 'milestones', title: 'Milestones', category: 'Adaptive', icon: 'Award', requiredEntity: 'Milestone' },
  { id: 27, slug: 'adaptive-rules', title: 'Adaptive Rules', category: 'Adaptive', icon: 'Sliders', requiredEntity: 'AdaptiveRule' },
  { id: 28, slug: 'analytics', title: 'Analytics', category: 'Adaptive', icon: 'BarChart3', requiredEntity: 'Subject' },
  { id: 29, slug: 'notifications', title: 'Notifications', category: 'Adaptive', icon: 'Bell', requiredEntity: 'Notification' },
  { id: 30, slug: 'achievements', title: 'Achievements', category: 'Adaptive', icon: 'Trophy', requiredEntity: 'Milestone' },

  // 31-33 Governance & Acceptance Tests
  { id: 31, slug: 'search', title: 'Global Search', category: 'Governance', icon: 'Search', requiredEntity: 'Subject' },
  { id: 32, slug: 'audit-logs', title: 'Audit Logs', category: 'Governance', icon: 'ScrollText', requiredEntity: 'AuditLog', badge: 'Immutable' },
  { id: 33, slug: 'system-settings', title: 'System Settings', category: 'Governance', icon: 'Settings', requiredEntity: 'Admin' },
];

export function getVisibleSectionsForRole(role: AdminRole): AdminNavSection[] {
  return ALL_ADMIN_NAV_SECTIONS.filter((sec) => {
    // Check if role has at least READ access to required entity
    const perm = checkPermission(role, sec.requiredEntity, 'READ');
    return perm.allowed;
  });
}

/**
 * Validation rules for Lesson creation & publishing (L-001..L-007)
 */
export function validateLesson(lesson: Partial<AdminLesson>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!lesson.title || lesson.title.trim().length === 0) {
    errors.push('Lesson title is required.');
  }
  if (!lesson.subjectName || lesson.subjectName.trim().length === 0) {
    errors.push('Subject mapping is required.');
  }
  if (!lesson.topicName || lesson.topicName.trim().length === 0) {
    errors.push('Topic mapping is required.');
  }
  if (!lesson.learningObjectives || lesson.learningObjectives.length === 0) {
    errors.push('At least one learning objective is required.');
  }
  if (!lesson.contentBlocks || lesson.contentBlocks.length === 0) {
    errors.push('Lesson must contain at least one content block.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation rules for Questions & PYQs (Q-001..Q-010)
 */
export function validateQuestion(question: Partial<AdminQuestion>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.questionText || question.questionText.trim().length === 0) {
    errors.push('Question text cannot be empty.');
  }
  if (!question.options || question.options.length < 2) {
    errors.push('Question must have at least 2 answer options.');
  } else {
    const hasCorrect = question.options.some((o) => o.isCorrect);
    if (!hasCorrect) {
      errors.push('At least one option must be marked as the correct answer.');
    }
  }
  if (!question.explanation || question.explanation.trim().length === 0) {
    errors.push('A valid conceptual explanation is required.');
  }
  if (question.isPYQ) {
    if (!question.pyqMetadata || !question.pyqMetadata.sourceYear) {
      errors.push('PYQ provenance required: source year and exam paper must be recorded.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation rules for Tests (T-001..T-010)
 */
export function validateTest(test: Partial<AdminTest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!test.title || test.title.trim().length === 0) {
    errors.push('Test title is required.');
  }
  if (!test.durationMinutes || test.durationMinutes <= 0) {
    errors.push('Test duration must be greater than 0 minutes.');
  }
  if (!test.questionIds || test.questionIds.length === 0) {
    errors.push('Test must contain at least one question.');
  }
  if (!test.proctoringPolicyId) {
    errors.push('A valid proctoring policy must be assigned.');
  }
  if (test.passingThresholdPercent === undefined || test.passingThresholdPercent <= 0 || test.passingThresholdPercent > 100) {
    errors.push('Passing threshold must be between 1% and 100%.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation for Proctoring Invalidation / Serious Decisions
 */
export function validateProctoringDecision(
  decision: ProctoringDecision,
  reason?: string
): { valid: boolean; error?: string } {
  if (decision === 'INVALIDATE' || decision === 'FLAG') {
    if (!reason || reason.trim().length < 8) {
      return {
        valid: false,
        error: 'A detailed operational justification (minimum 8 characters) is required when invalidating or flagging an attempt.',
      };
    }
  }
  return { valid: true };
}
