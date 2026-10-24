import type {
  ActivityDay, AppNotification, Course, MistakeItem, PYQItem, ResourceItem,
  SubjectMastery, TestSession, TodayUnit, UserProfile, WeakArea,
} from '../types';

type Json = Record<string, any>;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || `Request failed: ${response.status}`) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body as T;
}

export const novaApi = {
  me: () => request<{ email: string; role: string }>('/api/auth/me'),
  profile: () => request<Json>('/api/profile'),
  updateProfile: (payload: Json) => request<Json>('/api/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  dashboard: () => request<Json>('/api/dashboard'),
  courses: () => request<Json>('/api/courses'),
  plan: () => request<Json>('/api/plan/today'),
  analytics: () => request<Json>('/api/learning/analytics'),
  journey: () => request<Json>('/api/journey'),
  achievements: () => request<Json>('/api/achievements'),
  notifications: () => request<Json>('/api/notifications'),
  markNotificationRead: (id: string) => request<Json>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<Json>('/api/notifications/read-all', { method: 'POST' }),
  clearNotifications: () => request<Json>('/api/notifications/clear', { method: 'POST' }),
  bookmarks: () => request<Json>('/api/bookmarks'),
  calendar: () => request<Json>('/api/progress/calendar'),
  notes: () => request<Json>('/api/notes'),
  addNote: (payload: Json) => request<Json>('/api/notes', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNote: (id: string) => request<Json>(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  tests: () => request<Json>('/api/tests'),
  curriculumTree: () => request<Json>('/api/curriculum/tree?curriculumId=tnpsc-group-2-v1'),
  activeCurriculum: () => request<Json>('/api/curriculum/active'),
  curriculumProgress: () => request<Json>('/api/curriculum/progress'),
  quickLabStats: () => request<Json>('/api/quick-lab/stats'),
  quickLabModes: () => request<Json>('/api/quick-lab/modes'),
  quickLabNext: (mode: string) => request<Json>(`/api/quick-lab/${encodeURIComponent(mode)}/next`),
  quickLabSubmit: (payload: Json) => request<Json>('/api/quick-lab/submit', { method: 'POST', body: JSON.stringify(payload) }),
  saveOnboardingPreferences: (payload: Json) => request<Json>('/api/onboarding/preferences', { method: 'POST', body: JSON.stringify(payload) }),
  logStudyTime: (minutes: number) => request<Json>('/api/progress/study-time', { method: 'POST', body: JSON.stringify({ minutes }) }),
  question: (topic = 'mixed') => request<Json>(`/api/questions/next?topic=${encodeURIComponent(topic)}`),
  pyq: () => request<Json>('/api/pyqs/next'),
  pyqForTopic: (topic: string) => request<Json>(`/api/pyqs/next?topic=${encodeURIComponent(topic)}`),
  lesson: (topic: string) => request<Json>(`/api/lesson/${encodeURIComponent(topic)}`),
  mistake: () => request<Json>('/api/mistakes/next'),
  logout: () => request<Json>('/api/auth/logout', { method: 'POST' }),
  login: (email: string, password: string) => request<Json>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, phone?: string) => request<Json>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) }),
  bookmark: (questionId: string) => request<Json>('/api/bookmarks', { method: 'POST', body: JSON.stringify({ questionId }) }),
  attempt: (payload: Json) => request<Json>('/api/attempts', { method: 'POST', body: JSON.stringify(payload) }),
  startIntervention: (payload: Json) => request<Json>('/api/learning/interventions/start', { method: 'POST', body: JSON.stringify(payload) }),
  completeCurriculumUnit: (unitId: string, score?: number) => request<Json>('/api/curriculum/complete', { method: 'POST', body: JSON.stringify({ unitId, ...(score == null ? {} : { score }) }) }),
  resources: () => request<Json>('/api/resources'),
};

function phaseName(raw?: string): UserProfile['currentPhase'] {
  const value = String(raw || '').toLowerCase();
  if (value.includes('foundation')) return 'Foundation';
  if (value.includes('core')) return 'Core';
  if (value.includes('exam level')) return 'Exam Level';
  if (value.includes('advanced')) return 'Advanced';
  if (value.includes('competitive')) return 'Competitive';
  if (value.includes('exam ready')) return 'Exam Ready';
  return 'Orientation';
}
function levelName(phase: UserProfile['currentPhase']): UserProfile['level'] {
  if (phase === 'Advanced' || phase === 'Competitive' || phase === 'Exam Ready') return 'Advanced';
  if (phase === 'Core' || phase === 'Exam Level') return 'Intermediate';
  return 'Beginner';
}

export function mapProfile(profile: Json, dashboard: Json): UserProfile {
  const phase = phaseName(dashboard?.curriculum?.phase?.name);
  const progress = Number(dashboard?.curriculum?.progress?.percentage ?? 0);
  const minutes = Number(profile?.dailyGoalMinutes ?? 30);
  const todayLearningMinutes = Number(profile?.todayLearningMinutes ?? 0);
  return {
    name: profile?.name || dashboard?.learner?.name || 'Learner',
    handle: `@${String(profile?.name || dashboard?.learner?.name || 'learner').toLowerCase().replace(/\s+/g, '_')}`,
    avatarText: String(profile?.name || dashboard?.learner?.name || 'L').charAt(0).toUpperCase(),
    email: profile?.email,
    phone: profile?.phone,
    emojiAvatar: '🦉', programme: 'TNPSC', examTrack: 'TNPSC Group 2 & 2A',
    notificationsEnabled: true, emailNotifications: true, smsNotifications: false,
    exam: 'TNPSC Group 2', level: levelName(phase), currentPhase: phase,
    currentWeek: Number(dashboard?.curriculum?.week?.number ?? 1), currentDay: Number(dashboard?.curriculum?.day?.number ?? 1),
    xp: Math.round(progress * 10), nextLevelXp: Math.max(1000, Math.round(progress * 10) + 1000),
    streakDays: Number(profile?.streak ?? 0), hoursSpent: Number((todayLearningMinutes / 60).toFixed(1)),
    completedLabs: 0, certificates: Number(profile?.topicsMastered ?? 0),
    dailyGoal: { type: 'hours', target: Math.max(0.5, minutes / 60), current: Number((todayLearningMinutes / 60).toFixed(1)) },
  };
}

function difficulty(value: string): TodayUnit['difficulty'] {
  const v = String(value || '').toUpperCase();
  return v === 'HARD' ? 'Hard' : v === 'MEDIUM' ? 'Medium' : 'Easy';
}
function unitType(value: string): TodayUnit['type'] {
  const v = String(value || '').toUpperCase();
  if (v === 'PYQ') return 'PYQ';
  if (v === 'TEST' || v === 'MINI_ASSESSMENT') return 'TEST';
  if (v === 'REMEDIATION') return 'REMEDIATION';
  if (v === 'REVISION' || v === 'MEMORY_ECHO') return 'REVISION';
  if (v === 'PRACTICE' || v === 'TIMED_PRACTICE') return 'PRACTICE';
  return 'LESSON';
}
export function mapTodayUnits(plan: Json): TodayUnit[] {
  return (plan?.items || []).map((item: Json, index: number) => ({
    id: `${item.type || 'PLAN'}-${item.topicId || index}`, unitId: item.unitId, topicId: item.topicId, type: unitType(item.type),
    title: item.topicName || item.title || 'Adaptive learning activity', subject: item.subjectName || item.subject || 'TNPSC Group 2',
    estimatedMinutes: Number(item.estimatedMinutes ?? 15), difficulty: difficulty(item.difficulty),
    status: index === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    actionUrl: item.topicId ? `/lesson/${encodeURIComponent(item.topicId)}` : undefined,
  }));
}
export function mapSubjects(analytics: Json): SubjectMastery[] {
  return (analytics?.subjects || []).map((subject: Json, index: number) => {
    const percentage = Math.round(Number(subject.accuracy || 0) * 100);
    const status: SubjectMastery['status'] = percentage >= 85 ? 'Mastered' : percentage >= 70 ? 'Strong' : percentage >= 55 ? 'Familiar' : percentage >= 40 ? 'Developing' : 'Weak';
    return { id: subject.subjectId || `subject-${index}`, name: subject.subjectName || 'Subject', masteryPercentage: percentage, status,
      topicsCount: (analytics?.topics || []).filter((t: Json) => t.subjectId === subject.subjectId).length,
      color: ['bg-orange-500','bg-amber-500','bg-red-500','bg-emerald-500','bg-blue-500'][index % 5] };
  });
}
export function mapWeakAreas(analytics: Json): WeakArea[] {
  return (analytics?.topics || []).slice(0, 3).map((topic: Json) => {
    const mastery = Math.round(Number(topic.accuracy || 0) * 100);
    return { id: topic.topicId, topic: topic.topicName, subject: topic.subjectName || 'TNPSC', masteryPercentage: mastery,
      status: mastery < 40 ? 'Needs practice' : mastery < 60 ? 'Needs revision' : 'Improving',
      suggestedAction: mastery < 40 ? 'Practice adaptive MCQs' : 'Review and retest this topic' };
  });
}
export function buildCourseFromBackend(courses: Json, plan: Json): Course {
  const allLessons = (courses?.subjects || []).flatMap((s: Json) => (s.chapters || []).flatMap((c: Json) => (c.lessons || []).map((lesson: Json) => ({ ...lesson, subject: s.name, chapter: c.name }))));
  const selected = allLessons.find((lesson: Json) => lesson.id === plan?.topicId) || allLessons[0];
  const lessonList = allLessons.slice(0, 8);
  const completed = lessonList.filter((l: Json) => Number(l.completion || 0) >= 100).length;
  return { id: selected?.id || courses?.curriculumId || 'tnpsc-group-2', title: selected?.title || 'TNPSC Group 2 Adaptive Learning',
    category: `${courses?.exam || 'TNPSC Group 2'} · Adaptive Plan`, track: 'TNPSC Group 2 & 2A', currentModule: selected?.title || 'Adaptive Learning',
    totalModules: Math.max(1, lessonList.length), completedModules: completed, progress: Math.round(Number(selected?.completion || courses?.subjects?.[0]?.completion || 0)),
    description: plan?.reason || 'Continue your personalized TNPSC Group 2 adaptive learning path.', thumbnailTag: selected?.title || 'TNPSC Group 2',
    accentColor: '#ea580c', isBookmarked: false,
    lessons: lessonList.map((lesson: Json) => ({ id: lesson.id, title: lesson.title, duration: `${Math.max(10, Number(lesson.totalUnits || 1) * 5)} min`, completed: Number(lesson.completion || 0) >= 100,
      description: `${lesson.completedUnits || 0} of ${lesson.totalUnits || 0} learning units completed.` })) };
}
export function mapTests(payload: Json): TestSession[] {
  return (payload?.tests || []).map((test: Json, index: number) => ({ id: test.id, title: index === 0 ? 'Adaptive Weekly Assessment' : `TNPSC Test ${index + 1}`,
    phase: 'Adaptive', week: 1, questionsCount: Number(test.questionCount || 0), durationMinutes: 40, score: test.score == null ? undefined : Number(test.score),
    maxScore: Number(test.questionCount || 0), accuracy: test.score == null ? undefined : Math.round(Number(test.score)),
    status: test.status === 'COMPLETED' ? 'Completed' : test.status === 'IN_PROGRESS' ? 'Available' : 'Upcoming',
    recommendation: test.status === 'IN_PROGRESS' ? 'Continue the assessment selected by your adaptive learning plan.' : undefined }));
}
export function mapNotifications(payload: Json): AppNotification[] {
  return (payload?.items || []).map((item: Json) => ({ id: item.id, category: item.type === 'achievement' ? 'achievement' : 'general',
    title: item.title || 'Learning update', message: item.body || '', timeAgo: item.at ? new Date(item.at).toLocaleString() : 'Recently', timestamp: item.at ? new Date(item.at).getTime() : Date.now(), unread: Boolean(item.unread) }));
}
export function mapCalendar(payload: Json): ActivityDay[] {
  return (payload?.days || []).map((day: Json) => { const count = Number(day.count || 0); return { date: day.date, count, level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4 }; });
}
export function mapBookmarks(payload: Json): Course[] {
  return (payload?.bookmarks || []).map((item: Json) => ({ id: item.questionId, title: item.topicName || 'Saved Question', category: 'Saved question', track: 'TNPSC Group 2', currentModule: item.topicName || 'Question', totalModules: 1, completedModules: 0, progress: 0,
    description: item.prompt || '', thumbnailTag: 'PYQ / Practice', accentColor: '#ea580c', isBookmarked: true, lessons: [] }));
}
export function mapPyq(payload: Json): PYQItem | null {
  if (!payload?.questionId) return null;
  return { id: payload.questionId, exam: 'TNPSC Group 2', year: Number(payload.sourceYear || payload.year || new Date().getFullYear()), subject: payload.subjectName || payload.subject || 'TNPSC', chapter: payload.chapterName || 'Previous Year Question', topic: payload.topicName || 'PYQ', question: payload.prompt, options: payload.options || [], correctIndex: Number(payload.correctIndex ?? -1), explanation: payload.explanation || '', difficulty: difficulty(payload.difficulty) };
}
export function mapMistake(payload: Json): MistakeItem[] {
  if (!payload?.questionId) return [];
  return [{ id: payload.questionId, questionTitle: payload.prompt || 'Open mistake', subject: payload.subjectName || 'TNPSC', topic: payload.topicName || 'Review', mistakeType: payload.mistakeType || 'CONCEPT_GAP', count: Number(payload.count || 1), lastAttemptedDate: payload.lastAttemptedAt ? new Date(payload.lastAttemptedAt).toLocaleDateString() : 'Recently', resolved: false }];
}
export function mapResources(payload: Json): ResourceItem[] {
  return (payload?.resources || []).map((r: Json) => {
    const kb = Number(r.sizeBytes || 0) / 1024;
    const size = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
    const ext = String(r.contentType || '').includes('pdf') ? '.pdf' : '';
    return {
      id: r.id, title: r.title, type: 'Download' as const, category: r.category || 'General',
      sizeOrDomain: `${size}${ext}`, url: `/api/resources/${encodeURIComponent(r.id)}/download`,
      description: r.description || '',
    };
  });
}

export function mapPracticeQuestion(payload: Json) {
  if (!payload?.questionId) return null;
  return { id: payload.questionId, topic: payload.topicName || 'Adaptive Practice', question: payload.prompt, options: payload.options || [], correctIndex: Number(payload.correctIndex ?? -1), explanation: payload.explanation || 'Answer submitted to the adaptive engine.' };
}

export function mapStructuredCourses(payload: Json) {
  return (payload?.subjects || []).flatMap((subject: Json) =>
    (subject.chapters || []).map((chapter: Json) => {
      const lessons = (chapter.lessons || []).map((lesson: Json, index: number) => ({
        id: lesson.id,
        chapterNumber: index + 1,
        lessonNumber: index + 1,
        title: lesson.title,
        durationMinutes: Math.max(10, Number(lesson.totalUnits || 1) * 5),
        description: `${lesson.completedUnits || 0} of ${lesson.totalUnits || 0} units completed.`,
        keyConcepts: [],
        summaryNote: 'Learning content is supplied by the YASH curriculum backend.',
        steps: { learnCompleted: Number(lesson.completion || 0) >= 25, understandCompleted: Number(lesson.completion || 0) >= 50, practiceCompleted: Number(lesson.completion || 0) >= 75, assessmentCompleted: Number(lesson.completion || 0) >= 100 },
        isCompleted: Number(lesson.completion || 0) >= 100,
      }));
      const lessonsCount = lessons.length;
      const completedLessons = lessons.filter((lesson: any) => lesson.isCompleted).length;
      const overallCompletion = Number(chapter.completion || 0);
      return {
        id: chapter.id,
        slug: chapter.id,
        title: chapter.name,
        subjectGroup: subject.name === 'Aptitude and Mental Ability' ? 'Aptitude & Mental Ability' : subject.name === 'General English' ? 'Language' : 'General Studies',
        examTrack: payload.exam || 'TNPSC Group 2 / 2A',
        description: 'Backend-synced TNPSC curriculum chapter.',
        modules: [{ id: chapter.id, moduleNumber: 1, title: chapter.name, description: 'Curriculum chapter', lessons, pyqsCount: lessons.reduce((n: number, l: any) => n + Number(l.pyqUnits || 0), 0), completedPyqs: 0, practiceCount: lessons.reduce((n: number, l: any) => n + Number(l.totalUnits || 0), 0), completedPractice: lessons.reduce((n: number, l: any) => n + Number(l.completedUnits || 0), 0), moduleTestPassed: false }],
        lessonsCount, completedLessons, conceptsCount: lessonsCount, completedConcepts: completedLessons,
        practiceCount: lessons.reduce((n: number, l: any) => n + Number(l.totalUnits || 0), 0), completedPractice: lessons.reduce((n: number, l: any) => n + Number(l.completedUnits || 0), 0),
        pyqsCount: lessons.reduce((n: number, l: any) => n + Number(l.pyqUnits || 0), 0), completedPyqs: 0, moduleTestsCount: lessons.reduce((n: number, l: any) => n + Number(l.testUnits || 0), 0), completedModuleTests: 0,
        overallCompletion, finalCourseTestAvailable: false, finalCourseTestPassed: false,
      };
    })
  );
}
