export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_ADMIN'
  | 'SUBJECT_ADMIN'
  | 'QUESTION_REVIEWER'
  | 'SUPPORT';

export type AdminEntity =
  | 'Learner'
  | 'Admin'
  | 'Exam'
  | 'Subject'
  | 'Chapter'
  | 'Topic'
  | 'Concept'
  | 'Lesson'
  | 'Resource'
  | 'Question'
  | 'PYQ'
  | 'Test'
  | 'TestAttempt'
  | 'ProctoringPolicy'
  | 'ProctoringEvent'
  | 'ProctoringReport'
  | 'Milestone'
  | 'AdaptiveRule'
  | 'Notification'
  | 'AuditLog';

export type AdminAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'PUBLISH'
  | 'REVIEW'
  | 'APPROVE'
  | 'REJECT';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  assignedSubjects?: string[]; // For SUBJECT_ADMIN scope
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive: string;
  avatar?: string;
}

export type LessonStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type QuestionStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type TestType =
  | 'Diagnostic'
  | 'Topic'
  | 'Weekly'
  | 'Phase'
  | 'Milestone'
  | 'Full mock'
  | 'PYQ'
  | 'Speed'
  | 'Remediation';

export type ProctoringEventType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'CAMERA_DISABLED'
  | 'MIC_DISABLED'
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACE_DETECTED'
  | 'NETWORK_INTERRUPTION'
  | 'IDENTITY_CHECK_FAILED'
  | 'SUSPICIOUS_ACTIVITY';

export type ProctoringDecision =
  | 'CLEAR'
  | 'WARNING'
  | 'FLAG'
  | 'INVALIDATE'
  | 'REVIEW_REQUIRED';

export interface AdminLesson {
  id: string;
  title: string;
  description: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  chapterName: string;
  topicName: string;
  conceptName: string;
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  learningObjectives: string[];
  prerequisites: string[];
  estimatedDurationMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  language: 'English' | 'Tamil' | 'Bilingual';
  lessonType: 'Theory' | 'Interactive Lab' | 'Case Study' | 'Revision';
  contentBlocks: Array<{
    id: string;
    type: 'markdown' | 'callout' | 'formula' | 'code' | 'summary';
    title?: string;
    content: string;
  }>;
  examples: Array<{
    id: string;
    title: string;
    problem: string;
    solution: string;
  }>;
  practiceQuestionIds: string[];
  resourceIds: string[];
  status: LessonStatus;
  version: number;
  authorId: string;
  authorName: string;
  reviewerId?: string;
  reviewerName?: string;
  rejectionReason?: string;
  usageCount: number;
  completionRate: number;
  dropOffRate: number;
  avgScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminResource {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'Image' | 'Notes' | 'VideoMetadata' | 'Downloadable';
  subjectName: string;
  fileSize: string;
  downloadUrl: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  uploaderName: string;
  associatedLessonIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestion {
  id: string;
  questionText: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  examName: string;
  subjectName: string;
  chapterName: string;
  topicName: string;
  conceptName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'Assertion-Reason' | 'Match-Following' | 'Statement-Analysis';
  isPYQ: boolean;
  pyqMetadata?: {
    sourceYear: number;
    examGroup: string;
    paperNumber: string;
    questionNumber: number;
    sourcePage: number;
    verifiedProvenance: boolean;
  };
  generationSource: 'MANUAL_AUTHOR' | 'AI_GENERATED' | 'OFFICIAL_PAST_PAPER';
  status: QuestionStatus;
  authorName: string;
  reviewerName?: string;
  rejectionReason?: string;
  attemptsCount: number;
  accuracyRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPYQ {
  id: string;
  title: string;
  examGroup: string;
  paper: string;
  year: number;
  sourceDocumentName: string;
  totalQuestions: number;
  mappedQuestionsCount: number;
  verifiedLineage: boolean;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
}

export interface ProctoringPolicy {
  id: string;
  name: string;
  enabled: boolean;
  fullscreenRequired: boolean;
  tabSwitchDetection: boolean;
  copyPasteRestricted: boolean;
  cameraRequired: boolean;
  microphoneRequired: boolean;
  identityVerification: boolean;
  facePresenceDetection: boolean;
  multipleFaceDetection: boolean;
  networkInterruptionGracePeriodSec: number;
  maxViolationsAllowed: number;
  autoSubmitOnViolationLimit: boolean;
  manualReviewRequired: boolean;
  learnerConsentNotice: string;
}

export interface AdminTest {
  id: string;
  title: string;
  testType: TestType;
  examName: string;
  subjectName: string;
  topicNames: string[];
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarks: number;
  passingThresholdPercent: number;
  difficulty: 'Beginner' | 'Balanced' | 'High-Order' | 'Exam-Standard';
  randomizeQuestions: boolean;
  proctoringPolicyId: string;
  proctoringPolicyName: string;
  attemptLimit: number;
  instructions: string[];
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  questionIds: string[];
  sections: Array<{
    id: string;
    name: string;
    questionCount: number;
    marks: number;
  }>;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProctoringEvent {
  id: string;
  attemptId: string;
  learnerId: string;
  learnerName: string;
  testId: string;
  testTitle: string;
  timestamp: string;
  eventType: ProctoringEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidenceDetails: string;
  deviceMetadata: {
    browser: string;
    os: string;
    ipMasked: string;
    screenResolution: string;
  };
  reviewState: 'UNREVIEWED' | 'DISMISSED' | 'CONFIRMED';
}

export interface ProctoringAttemptReview {
  id: string;
  attemptId: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  testId: string;
  testTitle: string;
  startedAt: string;
  submittedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'COMPLETED' | 'SUSPICIOUS' | 'FLAGGED' | 'INVALIDATED';
  violationsCount: number;
  events: ProctoringEvent[];
  decision?: ProctoringDecision;
  decisionReason?: string;
  decisionBy?: string;
  decidedAt?: string;
}

export interface LearnerRecord {
  id: string;
  name: string;
  email: string;
  handle: string;
  phone: string;
  avatarText: string;
  targetExam: string;
  targetTrack: string;
  currentPhase: number;
  totalXp: number;
  level: number;
  streakDays: number;
  studyTimeHours: number;
  accuracyRate: number;
  overallReadiness: number;
  completedLessons: number;
  testsAttempted: number;
  weakTopics: string[];
  strongTopics: string[];
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'FLAGGED_PROCTORING';
  suspensionReason?: string;
  lastActive: string;
  createdAt: string;
}

export interface AdaptiveRule {
  id: string;
  name: string;
  subjectName: string;
  topicName: string;
  prerequisiteTopicNames: string[];
  topicWeight: number; // 1 - 10
  weaknessThresholdAccuracy: number; // e.g. 50%
  interventionType: 'REVISE_CONCEPTS' | 'PRACTICE_PYQS' | 'SPEED_DRILL' | 'DIAGNOSTIC_RETEST';
  remediationRuleDescription: string;
  active: boolean;
  timesTriggered: number;
  updatedAt: string;
}

export interface AdminMilestone {
  id: string;
  title: string;
  type: 'Weekly' | 'Phase' | 'Test' | 'Completion' | 'Streak' | 'Speed' | 'Mastery';
  tier: 'Gold' | 'Platinum' | 'Diamond';
  xpReward: number;
  targetCriterion: string;
  subjectScope?: string;
  isActive: boolean;
  totalEarnedCount: number;
  updatedAt: string;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'learning_reminder' | 'test_announcement' | 'milestone' | 'system_announcement';
  channels: Array<'in_app' | 'push' | 'email' | 'sms'>;
  targetAudience: 'ALL_LEARNERS' | 'TNPSC_GROUP_2' | 'WEAK_IN_POLITY' | 'AT_RISK_PROCTORING';
  deliveryStatus: 'SENT' | 'SCHEDULED' | 'FAILED' | 'DRAFT';
  sentAt?: string;
  recipientCount: number;
  openRatePercent: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  entity: AdminEntity;
  entityId: string;
  timestamp: string;
  ipAddress: string;
  beforeSnapshot?: Record<string, any>;
  afterSnapshot?: Record<string, any>;
  reason?: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
}

export interface AIContentProposal {
  id: string;
  originalFileName: string;
  fileSize: string;
  detectedSubject: string;
  matchedTopic: string;
  isExistingTopicMatch: boolean;
  confidenceScore: number; // 0 - 100
  extractedConceptsCount: number;
  duplicateDetected: boolean;
  duplicateNote?: string;
  status: 'PENDING_HUMAN_REVIEW' | 'APPROVED_PROCEED' | 'REJECTED' | 'PUBLISHED';
  reviewedBy?: string;
  createdAt: string;
}

export interface AcceptanceTestCase {
  id: string;
  category: 'LESSON' | 'QUESTION' | 'TEST' | 'PROCTORING';
  name: string;
  description: string;
  expectedResult: 'PASS' | 'FAIL' | 'DENY' | 'FLAG' | 'ARCHIVE' | 'REVIEW_REQUIRED';
  executedResult?: 'PASS' | 'FAIL' | 'DENY' | 'FLAG' | 'ARCHIVE' | 'REVIEW_REQUIRED';
  status: 'IDLE' | 'PASSED' | 'FAILED';
  diagnosticLog?: string;
}
