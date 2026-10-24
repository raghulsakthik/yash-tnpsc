import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Edit,
  Archive,
  Trash2,
  Send,
  Eye,
  FileCheck,
  AlertTriangle,
  History,
  X,
  Sparkles,
} from 'lucide-react';
import { AdminLesson, AdminRole, LessonStatus } from '../../types/admin';
import { checkPermission, validateLesson } from '../../utils/adminPermissions';

interface LessonsViewProps {
  role: AdminRole;
  lessons: AdminLesson[];
  assignedSubjects?: string[];
  onSaveLesson: (lesson: AdminLesson, reason?: string) => void;
  onArchiveLesson: (lessonId: string, reason: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  role,
  lessons,
  assignedSubjects,
  onSaveLesson,
  onArchiveLesson,
  onDeleteLesson,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LessonStatus>('ALL');
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedLessonForPreview, setSelectedLessonForPreview] = useState<AdminLesson | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [auditReason, setAuditReason] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubject, setFormSubject] = useState('Indian Polity & Constitution');
  const [formTopic, setFormTopic] = useState('Historical Evolution & Drafting');
  const [formChapter, setFormChapter] = useState('Constitutional Architecture');
  const [formObjectives, setFormObjectives] = useState('Analyze 1935 Act lineage\nDistinguish federal vs unitary balance');
  const [formDifficulty, setFormDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [formDuration, setFormDuration] = useState(35);
  const [formContentMarkdown, setFormContentMarkdown] = useState('## Conceptual Architecture\nKey provisions adopted from 1935 Act...');

  const canCreate = checkPermission(role, 'Lesson', 'CREATE').allowed;
  const canPublish = checkPermission(role, 'Lesson', 'PUBLISH').allowed;

  const filtered = lessons.filter((lsn) => {
    const matchesSearch =
      lsn.title.toLowerCase().includes(search.toLowerCase()) ||
      lsn.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      lsn.topicName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || lsn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openEditModal = (lesson: AdminLesson) => {
    setEditingLesson(lesson);
    setFormTitle(lesson.title);
    setFormDescription(lesson.description);
    setFormSubject(lesson.subjectName);
    setFormTopic(lesson.topicName);
    setFormChapter(lesson.chapterName);
    setFormObjectives(lesson.learningObjectives.join('\n'));
    setFormDifficulty(lesson.difficulty);
    setFormDuration(lesson.estimatedDurationMinutes);
    setFormContentMarkdown(lesson.contentBlocks[0]?.content || '');
    setValidationErrors([]);
    setAuditReason('');
    setIsNewModalOpen(true);
  };

  const openNewModal = () => {
    setEditingLesson(null);
    setFormTitle('');
    setFormDescription('');
    setFormSubject(assignedSubjects?.[0] || 'Indian Polity & Constitution');
    setFormTopic('');
    setFormChapter('');
    setFormObjectives('');
    setFormDifficulty('Intermediate');
    setFormDuration(30);
    setFormContentMarkdown('');
    setValidationErrors([]);
    setAuditReason('');
    setIsNewModalOpen(true);
  };

  const handleSave = (targetStatus?: LessonStatus) => {
    // Subject Scope Check
    if (role === 'SUBJECT_ADMIN' && assignedSubjects && assignedSubjects.length > 0) {
      const allowed = assignedSubjects.some(
        (s) => s.toLowerCase() === formSubject.toLowerCase()
      );
      if (!allowed) {
        setValidationErrors([
          `Subject Scope Violation: You are restricted to [${assignedSubjects.join(
            ', '
          )}], not '${formSubject}'.`,
        ]);
        return;
      }
    }

    const objectivesArray = formObjectives
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const lessonData: Partial<AdminLesson> = {
      title: formTitle,
      description: formDescription,
      subjectName: formSubject,
      topicName: formTopic,
      chapterName: formChapter,
      learningObjectives: objectivesArray,
      difficulty: formDifficulty,
      estimatedDurationMinutes: Number(formDuration),
      contentBlocks: [
        {
          id: 'cb-primary',
          type: 'markdown',
          title: 'Primary Lesson Module Content',
          content: formContentMarkdown || 'Default syllabus material.',
        },
      ],
    };

    const val = validateLesson(lessonData);
    if (!val.valid) {
      setValidationErrors(val.errors);
      return;
    }

    const nextStatus: LessonStatus =
      targetStatus || (editingLesson ? editingLesson.status : 'DRAFT');

    const updatedLesson: AdminLesson = {
      ...(editingLesson || {
        id: `lsn-${Date.now()}`,
        examId: 'exam-01',
        examName: 'TNPSC Group 2 & 2A Combined',
        subjectId: 'subj-01',
        conceptName: formTopic,
        phaseNumber: 1,
        weekNumber: 1,
        dayNumber: 1,
        prerequisites: ['Basic foundation'],
        language: 'Bilingual',
        lessonType: 'Theory',
        examples: [],
        practiceQuestionIds: [],
        resourceIds: [],
        authorId: 'adm-01',
        authorName: 'NOVA Admin',
        usageCount: 0,
        completionRate: 0,
        dropOffRate: 0,
        avgScore: 0,
        createdAt: new Date().toISOString(),
      }),
      ...lessonData,
      title: formTitle,
      description: formDescription,
      subjectName: formSubject,
      topicName: formTopic,
      chapterName: formChapter,
      learningObjectives: objectivesArray,
      difficulty: formDifficulty,
      estimatedDurationMinutes: Number(formDuration),
      contentBlocks: lessonData.contentBlocks!,
      status: nextStatus,
      version: editingLesson ? editingLesson.version + 1 : 1,
      updatedAt: new Date().toISOString(),
    };

    onSaveLesson(
      updatedLesson,
      auditReason || (editingLesson ? `Updated lesson to v${updatedLesson.version}` : 'Created draft lesson')
    );
    setIsNewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Curriculum Lesson Management & Lifecycle
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Author, version, review, and publish lessons across TNPSC syllabus modules.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Lesson</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search lessons by title, topic or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(['ALL', 'PUBLISHED', 'IN_REVIEW', 'APPROVED', 'DRAFT', 'ARCHIVED'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap font-medium ${
                  statusFilter === st
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {st === 'ALL' ? 'All Lessons' : st.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lsn) => (
          <div
            key={lsn.id}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                  {lsn.subjectName}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    lsn.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : lsn.status === 'IN_REVIEW'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : lsn.status === 'APPROVED'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : lsn.status === 'ARCHIVED'
                      ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {lsn.status.replace('_', ' ')} · v{lsn.version}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-white line-clamp-2">
                {lsn.title}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 line-clamp-2 dark:text-neutral-400">
                {lsn.description}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-400 dark:border-neutral-800">
                <span>Phase {lsn.phaseNumber} · Day {lsn.dayNumber}</span>
                <span>{lsn.estimatedDurationMinutes} mins</span>
              </div>

              {/* Usage & Dropoff metrics */}
              {lsn.usageCount > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-2 text-[10px] dark:bg-neutral-800/40">
                  <div>
                    <span className="text-neutral-400">Learners:</span>{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">{lsn.usageCount}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Completion:</span>{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{lsn.completionRate}%</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedLessonForPreview(lsn)}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Inspect</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(lsn)}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                >
                  Edit / Version
                </button>

                {lsn.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => onArchiveLesson(lsn.id, 'Archived per curriculum update')}
                    className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Archive lesson"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lesson Edit / Versioning Modal */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {editingLesson ? `Edit Lesson: ${editingLesson.title} (v${editingLesson.version})` : 'Author New Lesson'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {editingLesson ? 'Publishing modifications increments version and triggers audit trail.' : 'Create draft curriculum module.'}
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Validation Errors alert */}
            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Validation Incomplete:</span>
                </div>
                <ul className="list-disc pl-5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Fundamental Rights: Articles 14 to 18"
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Concise overview of syllabus competencies covered"
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Subject *
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Indian Polity & Constitution">Indian Polity & Constitution</option>
                    <option value="General Studies">General Studies</option>
                    <option value="Aptitude & Mental Ability">Aptitude & Mental Ability</option>
                    <option value="History & Culture of Tamil Nadu">History & Culture of Tamil Nadu</option>
                    <option value="Physics & Chemistry">Physics & Chemistry (Unassigned)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Topic Mapping *
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Right to Equality"
                    className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Learning Objectives (1 per line) *
                </label>
                <textarea
                  rows={2}
                  value={formObjectives}
                  onChange={(e) => setFormObjectives(e.target.value)}
                  placeholder="Analyze Rule of Law&#10;Memorize Article 14-18 doctrines"
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Content Blocks (Markdown / Syllabus Material) *
                </label>
                <textarea
                  rows={4}
                  value={formContentMarkdown}
                  onChange={(e) => setFormContentMarkdown(e.target.value)}
                  placeholder="## Core Constitutional Architecture..."
                  className="w-full rounded-xl border border-neutral-200 p-2.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Revision Reason (Recorded in Audit Trail)
                </label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g., Updated 1935 Act comparative table with latest TNPSC syllabus mapping"
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('DRAFT')}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('IN_REVIEW')}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-xs cursor-pointer"
                >
                  Submit for Review
                </button>

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => handleSave('PUBLISHED')}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    Publish to Cohort
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Inspector Modal */}
      {selectedLessonForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                  {selectedLessonForPreview.subjectName}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {selectedLessonForPreview.title}
                </h3>
                <p className="text-xs text-neutral-400">
                  Version {selectedLessonForPreview.version} · Author: {selectedLessonForPreview.authorName} · Status: {selectedLessonForPreview.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedLessonForPreview(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Learning Objectives:
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-400">
                  {selectedLessonForPreview.learningObjectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                  Content Preview:
                </h4>
                <div className="rounded-xl border border-neutral-200 bg-white p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950">
                  {selectedLessonForPreview.contentBlocks[0]?.content || 'No content blocks found.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLessonForPreview(null)}
                className="rounded-xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white dark:bg-white dark:text-neutral-900 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
