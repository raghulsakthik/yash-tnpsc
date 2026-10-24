import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Sparkles,
  FileCheck,
  Edit,
  Copy,
  Archive,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { AdminQuestion, AdminRole, QuestionStatus } from '../../types/admin';
import { checkPermission, validateQuestion } from '../../utils/adminPermissions';

interface QuestionsViewProps {
  role: AdminRole;
  questions: AdminQuestion[];
  assignedSubjects?: string[];
  isReviewQueueMode?: boolean;
  onSaveQuestion: (question: AdminQuestion, reason?: string) => void;
  onUpdateStatus: (questionId: string, status: QuestionStatus, reason?: string) => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  role,
  questions,
  assignedSubjects,
  isReviewQueueMode = false,
  onSaveQuestion,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PYQ' | 'ORIGINAL'>('ALL');
  const [selectedQuestion, setSelectedQuestion] = useState<AdminQuestion | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form fields
  const [formText, setFormText] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSubject, setFormSubject] = useState('Indian Polity & Constitution');
  const [formTopic, setFormTopic] = useState('Preamble & Philosophical Pillars');
  const [formDifficulty, setFormDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [formIsPYQ, setFormIsPYQ] = useState(false);
  const [formPYQYear, setFormPYQYear] = useState(2024);
  const [formPYQPaper, setFormPYQPaper] = useState('TNPSC Group 2 Prelims Paper I');
  const [formPYQNumber, setFormPYQNumber] = useState(42);
  const [formOptions, setFormOptions] = useState([
    { id: 'opt-1', text: '', isCorrect: true },
    { id: 'opt-2', text: '', isCorrect: false },
    { id: 'opt-3', text: '', isCorrect: false },
    { id: 'opt-4', text: '', isCorrect: false },
  ]);

  const canCreate = checkPermission(role, 'Question', 'CREATE').allowed;
  const canReview = checkPermission(role, 'Question', 'REVIEW').allowed;
  const canApprove = checkPermission(role, 'Question', 'APPROVE').allowed;

  const filtered = questions.filter((q) => {
    if (isReviewQueueMode && q.status !== 'IN_REVIEW') return false;
    const matchesSearch =
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      q.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      q.topicName.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      filterType === 'ALL' ? true : filterType === 'PYQ' ? q.isPYQ : !q.isPYQ;
    return matchesSearch && matchesType;
  });

  const openNewQuestionModal = () => {
    setEditingQuestion(null);
    setFormText('');
    setFormExplanation('');
    setFormSubject(assignedSubjects?.[0] || 'Indian Polity & Constitution');
    setFormTopic('Constitutional Architecture');
    setFormDifficulty('Medium');
    setFormIsPYQ(false);
    setFormPYQYear(2024);
    setFormPYQPaper('TNPSC Group 2 Prelims');
    setFormPYQNumber(1);
    setFormOptions([
      { id: 'opt-1', text: '', isCorrect: true },
      { id: 'opt-2', text: '', isCorrect: false },
      { id: 'opt-3', text: '', isCorrect: false },
      { id: 'opt-4', text: '', isCorrect: false },
    ]);
    setValidationErrors([]);
    setIsEditorOpen(true);
  };

  const openEditModal = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setFormText(q.questionText);
    setFormExplanation(q.explanation);
    setFormSubject(q.subjectName);
    setFormTopic(q.topicName);
    setFormDifficulty(q.difficulty);
    setFormIsPYQ(q.isPYQ);
    if (q.pyqMetadata) {
      setFormPYQYear(q.pyqMetadata.sourceYear);
      setFormPYQPaper(q.pyqMetadata.paperNumber);
      setFormPYQNumber(q.pyqMetadata.questionNumber);
    }
    setFormOptions(q.options);
    setValidationErrors([]);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (q: AdminQuestion) => {
    const duplicated: AdminQuestion = {
      ...q,
      id: `q-dup-${Date.now()}`,
      questionText: `[COPY] ${q.questionText}`,
      status: 'DRAFT',
      attemptsCount: 0,
      accuracyRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveQuestion(duplicated, `Duplicated from question ${q.id}`);
  };

  const handleSave = (targetStatus?: QuestionStatus) => {
    // Subject scope check
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

    const payload: Partial<AdminQuestion> = {
      questionText: formText,
      explanation: formExplanation,
      options: formOptions,
      isPYQ: formIsPYQ,
      pyqMetadata: formIsPYQ
        ? {
            sourceYear: Number(formPYQYear),
            examGroup: 'TNPSC Group 2 & 2A',
            paperNumber: formPYQPaper,
            questionNumber: Number(formPYQNumber),
            sourcePage: 12,
            verifiedProvenance: true,
          }
        : undefined,
    };

    const val = validateQuestion(payload);
    if (!val.valid) {
      setValidationErrors(val.errors);
      return;
    }

    const updated: AdminQuestion = {
      ...(editingQuestion || {
        id: `q-${Date.now()}`,
        examName: 'TNPSC Group 2 & 2A Combined',
        chapterName: 'Core Module',
        conceptName: formTopic,
        type: 'MCQ',
        generationSource: formIsPYQ ? 'OFFICIAL_PAST_PAPER' : 'MANUAL_AUTHOR',
        authorName: 'Admin Contributor',
        attemptsCount: 0,
        accuracyRate: 0,
        createdAt: new Date().toISOString(),
      }),
      questionText: formText,
      explanation: formExplanation,
      subjectName: formSubject,
      topicName: formTopic,
      difficulty: formDifficulty,
      options: formOptions,
      isPYQ: formIsPYQ,
      pyqMetadata: payload.pyqMetadata,
      status: targetStatus || (editingQuestion ? editingQuestion.status : 'DRAFT'),
      updatedAt: new Date().toISOString(),
    };

    onSaveQuestion(
      updated,
      editingQuestion ? `Updated MCQ ${updated.id}` : `Authored new question in ${formSubject}`
    );
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {isReviewQueueMode ? 'Question Review & Quality Queue' : 'Question Bank & PYQ Repository'}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isReviewQueueMode
              ? 'Validate answer keys, conceptual explanations, duplicate detection, and curriculum alignment.'
              : 'Official past papers (2022-2024), topic MCQs, and syllabus alignment.'}
          </p>
        </div>

        {canCreate && !isReviewQueueMode && (
          <button
            onClick={openNewQuestionModal}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Question</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search questions by text or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:outline-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(['ALL', 'PYQ', 'ORIGINAL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap font-medium ${
                filterType === t
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {t === 'ALL' ? 'All Questions' : t === 'PYQ' ? 'Verified PYQs' : 'Original Practice'}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 transition-all space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase">
                  {q.id}
                </span>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                  {q.subjectName} · {q.topicName}
                </span>
                {q.isPYQ && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    <Award className="h-3 w-3" />
                    <span>PYQ {q.pyqMetadata?.sourceYear} (Q.{q.pyqMetadata?.questionNumber})</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    q.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : q.status === 'IN_REVIEW'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {q.status}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {q.difficulty}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-relaxed">
              {q.questionText}
            </p>

            {/* Options display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`rounded-xl border p-2.5 flex items-center justify-between ${
                    opt.isCorrect
                      ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-neutral-100 bg-neutral-50/70 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-300'
                  }`}
                >
                  <span>{opt.text}</span>
                  {opt.isCorrect && (
                    <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      CORRECT
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div className="rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400">
              <strong className="text-neutral-800 dark:text-neutral-200">Explanation:</strong> {q.explanation}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800 text-xs">
              <div className="text-[11px] text-neutral-400">
                Author: {q.authorName} · {q.attemptsCount} attempts ({q.accuracyRate}% acc)
              </div>

              <div className="flex items-center gap-2">
                {canApprove && q.status === 'IN_REVIEW' && (
                  <>
                    <button
                      onClick={() => onUpdateStatus(q.id, 'PUBLISHED', 'Approved and published to bank')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                    <button
                      onClick={() => onUpdateStatus(q.id, 'REJECTED', 'Returned for clarification')}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleDuplicate(q)}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer inline-flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>Duplicate</span>
                </button>

                <button
                  onClick={() => openEditModal(q)}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Question Editor Modal */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingQuestion ? `Edit Question (${editingQuestion.id})` : 'Author New MCQ'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <div className="font-bold mb-1">Please fix the following validation errors:</div>
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
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Enter the official question text here..."
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Subject Mapping *
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
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Topic Name *
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

              {/* Options Editor */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Answer Options (Select the correct radio button) *
                </label>
                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={opt.isCorrect}
                        onChange={() => {
                          setFormOptions((prev) =>
                            prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                          );
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormOptions((prev) =>
                            prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                          );
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className={`flex-1 rounded-xl border p-2 text-xs dark:bg-neutral-800 dark:text-white ${
                          opt.isCorrect
                            ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-600'
                            : 'border-neutral-200 dark:border-neutral-700'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* PYQ Provenance Section */}
              <div className="rounded-2xl border border-neutral-200 p-3.5 space-y-2.5 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-900 dark:text-white">
                  <input
                    type="checkbox"
                    checked={formIsPYQ}
                    onChange={(e) => setFormIsPYQ(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Mark as Official Past Year Question (PYQ)</span>
                </label>

                {formIsPYQ && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <label className="block text-neutral-500 mb-0.5">Source Year *</label>
                      <input
                        type="number"
                        value={formPYQYear}
                        onChange={(e) => setFormPYQYear(Number(e.target.value))}
                        className="w-full rounded-lg border border-neutral-200 p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-0.5">Exam Paper *</label>
                      <input
                        type="text"
                        value={formPYQPaper}
                        onChange={(e) => setFormPYQPaper(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-0.5">Question # *</label>
                      <input
                        type="number"
                        value={formPYQNumber}
                        onChange={(e) => setFormPYQNumber(Number(e.target.value))}
                        className="w-full rounded-lg border border-neutral-200 p-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Conceptual Explanation *
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Detail the constitutional/factual basis for the correct choice..."
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
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
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 cursor-pointer shadow-xs"
              >
                Submit for Review
              </button>
              <button
                type="button"
                onClick={() => handleSave('PUBLISHED')}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
              >
                Publish Directly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
