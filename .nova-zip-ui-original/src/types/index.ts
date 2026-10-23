export interface Course {
  id: string;
  title: string;
  category: string;
  track: string;
  currentModule: string;
  totalModules: number;
  completedModules: number;
  progress: number; // 0 - 100
  description: string;
  thumbnailTag: string;
  accentColor: string;
  isBookmarked: boolean;
  lessons: {
    id: string;
    title: string;
    duration: string;
    completed: boolean;
    description: string;
  }[];
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number; // 0 to 4+
  level: number; // 0 to 4
}

export interface DailyGoal {
  type: 'hours' | 'lessons';
  target: number;
  current: number;
}

export interface UserProfile {
  name: string;
  handle: string;
  avatarText: string;
  email?: string;
  phone?: string;
  emojiAvatar?: string;
  programme?: string;
  examTrack?: string;
  subjectProficiencies?: Record<string, 'Beginner' | 'Developing' | 'Strong' | 'Mastered'>;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  exam: string; // 'TNPSC Group 2' | 'UPSC' | 'SSC'
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  currentPhase: 'Orientation' | 'Foundation' | 'Core' | 'Exam Level' | 'Advanced' | 'Competitive' | 'Exam Ready';
  currentWeek: number;
  currentDay: number;
  xp: number;
  nextLevelXp: number;
  streakDays: number;
  hoursSpent: number;
  completedLabs: number;
  certificates: number;
  dailyGoal?: DailyGoal;
}

export type LearningUnitType =
  | 'LESSON'
  | 'PRACTICE'
  | 'GUIDED_PRACTICE'
  | 'APPLICATION'
  | 'EXAM_PRACTICE'
  | 'PYQ'
  | 'REVISION'
  | 'TEST'
  | 'REMEDIATION';

export interface TodayUnit {
  id: string;
  type: LearningUnitType;
  title: string;
  subject: string;
  estimatedMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  actionUrl?: string;
}

export interface SubjectMastery {
  id: string;
  name: string;
  masteryPercentage: number;
  status: 'Weak' | 'Developing' | 'Familiar' | 'Strong' | 'Mastered';
  topicsCount: number;
  color: string;
}

export interface WeakArea {
  id: string;
  topic: string;
  subject: string;
  masteryPercentage: number;
  status: 'Needs practice' | 'Needs revision' | 'Improving';
  suggestedAction: string;
}

export interface PYQItem {
  id: string;
  exam: string;
  year: number;
  subject: string;
  chapter: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  attempted?: boolean;
  selectedOption?: number | null;
  isBookmarked?: boolean;
}

export interface MistakeItem {
  id: string;
  questionTitle: string;
  subject: string;
  topic: string;
  mistakeType: 'CONCEPT_GAP' | 'CARELESS_ERROR' | 'TIME_PRESSURE' | 'MISREAD' | 'GUESS';
  count: number;
  lastAttemptedDate: string;
  resolved: boolean;
}

export interface TestSession {
  id: string;
  title: string;
  phase: string;
  week: number;
  questionsCount: number;
  durationMinutes: number;
  score?: number;
  maxScore: number;
  accuracy?: number;
  status: 'Available' | 'Completed' | 'Upcoming';
  recommendation?: string;
}

export interface NoteItem {
  id: string;
  courseTitle: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
}

export interface PracticeQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LabProject {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  initialCode?: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface ResourceItem {
  id: string;
  title: string;
  type: 'Link' | 'Download';
  category: string;
  sizeOrDomain: string;
  url: string;
  description: string;
}

export type NotificationCategory = 'milestone' | 'test_reminder' | 'achievement' | 'general';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timeAgo: string;
  timestamp: number;
  unread: boolean;
  priority?: 'high' | 'normal' | 'low';
  actionLabel?: string;
  targetView?: string;
  badgeLabel?: string;
  isMilestoneBadge?: boolean;
  milestoneType?: 'module_completion' | 'streak' | 'level' | 'mastery';
  moduleTitle?: string;
  moduleNumber?: number;
  courseName?: string;
  badgeTier?: 'Gold' | 'Silver' | 'Platinum' | 'Diamond';
  xpBonus?: number;
  celebratory?: boolean;
}

export interface StructuredLesson {
  id: string;
  chapterNumber: number;
  lessonNumber: number;
  title: string;
  durationMinutes: number;
  description: string;
  keyConcepts: string[];
  pyqReference?: string;
  summaryNote: string;
  steps: {
    learnCompleted: boolean;
    understandCompleted: boolean;
    practiceCompleted: boolean;
    assessmentCompleted: boolean;
  };
  isCompleted: boolean;
  practiceQuestions?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  assessmentQuestion?: {
    examYear: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface StructuredModule {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  lessons: StructuredLesson[];
  pyqsCount: number;
  completedPyqs: number;
  practiceCount: number;
  completedPractice: number;
  moduleTestPassed: boolean;
  moduleTestScore?: number;
}

export interface StructuredCourse {
  id: string;
  slug: string;
  title: string;
  subjectGroup: 'General Studies' | 'Aptitude & Mental Ability' | 'Language';
  examTrack: string;
  description: string;
  modules: StructuredModule[];
  lessonsCount: number;
  completedLessons: number;
  conceptsCount: number;
  completedConcepts: number;
  practiceCount: number;
  completedPractice: number;
  pyqsCount: number;
  completedPyqs: number;
  moduleTestsCount: number;
  completedModuleTests: number;
  overallCompletion: number;
  finalCourseTestAvailable: boolean;
  finalCourseTestPassed: boolean;
  lastStudiedLessonId?: string;
}

