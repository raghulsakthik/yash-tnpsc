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
  // SUPER_ADMIN has full governance over all entities
  if (role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  // Admin management: ONLY SUPER_ADMIN
  if (entity === 'Admin') {
    return { allowed: false, reason: 'Only SUPER_ADMIN can manage administrative credentials and roles.' };
  }

  // Subject Scope Check for SUBJECT_ADMIN
  if (role === 'SUBJECT_ADMIN') {
    if (options?.entitySubject && options?.assignedSubjects) {
      const isAssigned = options.assignedSubjects.some(
        (subj) => subj.toLowerCase() === options.entitySubject?.toLowerCase()
      );
      if (!isAssigned) {
        return {
          allowed: false,
          reason: `Subject scope violation: You are only authorized for [${options.assignedSubjects.join(
            ', '
          )}], not '${options.entitySubject}'.`,
        };
      }
    }
  }

  // Learner entity
  if (entity === 'Learner') {
    if (role === 'ADMIN') {
      if (action === 'DELETE') {
        return { allowed: false, reason: 'ADMIN cannot delete learner accounts (Archive/Suspend only).' };
      }
      return { allowed: true };
    }
    if (role === 'SUPPORT') {
      if (action === 'READ' || action === 'UPDATE') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'SUPPORT role can only view and update support status/suspension.' };
    }
    return { allowed: false, reason: `${role} does not have access to Learner administration.` };
  }

  // Lesson entity
  if (entity === 'Lesson') {
    if (role === 'ADMIN' || role === 'CONTENT_ADMIN') {
      return { allowed: true };
    }
    if (role === 'SUBJECT_ADMIN') {
      return { allowed: true };
    }
    if (role === 'QUESTION_REVIEWER') {
      if (action === 'READ' || action === 'REVIEW') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'QUESTION_REVIEWER cannot author or publish lessons.' };
    }
    return { allowed: false, reason: `${role} is not authorized for lesson operations.` };
  }

  // Question & PYQ entities
  if (entity === 'Question' || entity === 'PYQ') {
    if (role === 'ADMIN' || role === 'CONTENT_ADMIN' || role === 'SUBJECT_ADMIN') {
      return { allowed: true };
    }
    if (role === 'QUESTION_REVIEWER') {
      if (action === 'DELETE') {
        return { allowed: false, reason: 'QUESTION_REVIEWER cannot delete questions from the central bank.' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: `${role} cannot manage question banks.` };
  }

  // Test Builder entity
  if (entity === 'Test') {
    if (role === 'ADMIN') {
      return { allowed: true };
    }
    if (role === 'CONTENT_ADMIN' || role === 'SUBJECT_ADMIN') {
      if (action === 'DELETE') {
        return { allowed: false, reason: 'Only ADMIN or SUPER_ADMIN can delete/archive test papers.' };
      }
      return { allowed: true };
    }
    if (role === 'QUESTION_REVIEWER') {
      return {
        allowed: action === 'READ' || action === 'REVIEW',
        reason: action !== 'READ' && action !== 'REVIEW' ? 'QUESTION_REVIEWER can only inspect test questions.' : undefined,
      };
    }
    if (role === 'SUPPORT') {
      return { allowed: action === 'READ' };
    }
    return { allowed: false, reason: 'Unauthorized for test builder.' };
  }

  // Proctoring Policy
  if (entity === 'ProctoringPolicy') {
    if (role === 'ADMIN') {
      if (action === 'READ' || action === 'UPDATE') return { allowed: true };
      return { allowed: false, reason: 'ADMIN can read/update policy parameters, but cannot delete security policies.' };
    }
    return { allowed: false, reason: 'Proctoring policies can only be managed by SUPER_ADMIN or operational ADMIN.' };
  }

  // Proctoring Event & Proctoring Report
  if (entity === 'ProctoringEvent' || entity === 'ProctoringReport') {
    if (role === 'ADMIN') return { allowed: true };
    if (role === 'QUESTION_REVIEWER' && action === 'READ') return { allowed: true };
    if (role === 'SUPPORT' && (action === 'READ' || action === 'UPDATE')) return { allowed: true };
    return { allowed: false, reason: `${role} has no proctoring oversight permissions.` };
  }

  // Adaptive Rules
  if (entity === 'AdaptiveRule') {
    if (role === 'ADMIN') return { allowed: true };
    if (role === 'SUBJECT_ADMIN' || role === 'QUESTION_REVIEWER') {
      return { allowed: action === 'READ' };
    }
    return { allowed: false, reason: 'Adaptive rule configuration restricted.' };
  }

  // Notifications
  if (entity === 'Notification') {
    if (role === 'ADMIN') return { allowed: true };
    if (role === 'SUPPORT' && action === 'READ') return { allowed: true };
    return { allowed: false, reason: 'Notification authoring restricted to Admins.' };
  }

  // Audit Log
  if (entity === 'AuditLog') {
    if (action === 'READ') return { allowed: true };
    return { allowed: false, reason: 'Audit logs are immutable and cannot be edited or deleted.' };
  }

  // Default fallback
  return { allowed: true };
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
