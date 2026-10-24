import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Award,
  AlertTriangle,
  Eye,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { AdminTest, AdminRole, ProctoringPolicy, AdminQuestion, TestType } from '../../types/admin';
import { checkPermission, validateTest } from '../../utils/adminPermissions';

interface TestBuilderViewProps {
  role: AdminRole;
  tests: AdminTest[];
  policies: ProctoringPolicy[];
  availableQuestions: AdminQuestion[];
  onSaveTest: (test: AdminTest, reason?: string) => void;
  onPublishTest: (testId: string) => void;
}

export const TestBuilderView: React.FC<TestBuilderViewProps> = ({
  role,
  tests,
  policies,
  availableQuestions,
  onSaveTest,
  onPublishTest,
}) => {
  const [search, setSearch] = useState('');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<AdminTest | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<TestType>('Milestone');
  const [formSubject, setFormSubject] = useState('Indian Polity & Constitution');
  const [formDuration, setFormDuration] = useState(45);
  const [formPassingPercent, setFormPassingPercent] = useState(60);
  const [formNegativeMarks, setFormNegativeMarks] = useState(0.5);
  const [formMarksPerQuestion, setFormMarksPerQuestion] = useState(2);
  const [formPolicyId, setFormPolicyId] = useState(policies[0]?.id || 'proc-pol-strict');
  const [formSelectedQuestionIds, setFormSelectedQuestionIds] = useState<string[]>([]);

  const canCreate = checkPermission(role, 'Test', 'CREATE').allowed;
  const canPublish = checkPermission(role, 'Test', 'PUBLISH').allowed;

  const openNewModal = () => {
    setEditingTest(null);
    setFormTitle('');
    setFormType('Milestone');
    setFormSubject('Indian Polity & Constitution');
    setFormDuration(45);
    setFormPassingPercent(60);
    setFormNegativeMarks(0.5);
    setFormMarksPerQuestion(2);
    setFormPolicyId(policies[0]?.id || '');
    setFormSelectedQuestionIds(availableQuestions.slice(0, 3).map((q) => q.id));
    setValidationErrors([]);
    setIsBuilderModalOpen(true);
  };

  const handleToggleQuestion = (qId: string) => {
    setFormSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSave = (targetStatus?: AdminTest['status']) => {
    const selectedPolicy = policies.find((p) => p.id === formPolicyId);

    const payload: Partial<AdminTest> = {
      title: formTitle,
      durationMinutes: Number(formDuration),
      questionIds: formSelectedQuestionIds,
      proctoringPolicyId: formPolicyId,
      passingThresholdPercent: Number(formPassingPercent),
    };

    const val = validateTest(payload);
    if (!val.valid) {
      setValidationErrors(val.errors);
      return;
    }

    const totalMarks = formSelectedQuestionIds.length * formMarksPerQuestion;

    const updated: AdminTest = {
      ...(editingTest || {
        id: `test-${Date.now()}`,
        examName: 'TNPSC Group 2 & 2A Combined',
        topicNames: ['Constitutional Architecture', 'Preamble'],
        difficulty: 'Exam-Standard',
        randomizeQuestions: true,
        attemptLimit: 2,
        instructions: ['Maintain full-screen supervision throughout test.'],
        sections: [{ id: 'sec-1', name: 'General Studies Section', questionCount: formSelectedQuestionIds.length, marks: totalMarks }],
        totalAttempts: 0,
        avgScore: 0,
        passRate: 0,
        createdAt: new Date().toISOString(),
      }),
      title: formTitle,
      testType: formType,
      subjectName: formSubject,
      durationMinutes: Number(formDuration),
      questionCount: formSelectedQuestionIds.length,
      marksPerQuestion: Number(formMarksPerQuestion),
      negativeMarks: Number(formNegativeMarks),
      passingThresholdPercent: Number(formPassingPercent),
      totalMarks,
      proctoringPolicyId: formPolicyId,
      proctoringPolicyName: selectedPolicy?.name || 'Assigned Policy',
      questionIds: formSelectedQuestionIds,
      status: targetStatus || (editingTest ? editingTest.status : 'DRAFT'),
      updatedAt: new Date().toISOString(),
    };

    onSaveTest(updated, editingTest ? `Updated test paper ${updated.id}` : 'Created test paper');
    setIsBuilderModalOpen(false);
  };

  const filteredTests = tests.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Test Builder & Assessment Architect
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Construct diagnostics, weekly milestones, phase benchmarks, and full mocks with assigned proctoring.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Test Paper</span>
          </button>
        )}
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {test.testType.toUpperCase()}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    test.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {test.status}
                </span>
              </div>

              <h3 className="mt-2 text-base font-bold text-neutral-900 dark:text-white line-clamp-1">
                {test.title}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {test.subjectName} · {test.examName}
              </p>

              {/* Test Spec Badges */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-neutral-50 p-3 text-center text-xs dark:bg-neutral-800/40">
                <div>
                  <span className="text-[10px] text-neutral-400">Questions</span>
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {test.questionCount}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Duration</span>
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {test.durationMinutes}m
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Total Marks</span>
                  <div className="font-bold text-neutral-900 dark:text-white">
                    {test.totalMarks}
                  </div>
                </div>
              </div>

              {/* Proctoring Tag */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">Policy: {test.proctoringPolicyName}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-400">
                {test.totalAttempts} attempts ({test.passRate}% pass)
              </span>

              {canPublish && test.status !== 'PUBLISHED' && (
                <button
                  onClick={() => onPublishTest(test.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Publish Test
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Builder Modal */}
      {isBuilderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingTest ? `Edit Test Paper (${editingTest.title})` : 'Construct New Test Paper'}
              </h3>
              <button
                onClick={() => setIsBuilderModalOpen(false)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <div className="font-bold mb-1">Validation Errors:</div>
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
                  Test Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. TNPSC Group 2 Foundation Milestone Mock 1"
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Test Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as TestType)}
                    className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Topic">Topic</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Phase">Phase</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Full mock">Full mock</option>
                    <option value="PYQ">PYQ</option>
                    <option value="Speed">Speed</option>
                    <option value="Remediation">Remediation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Subject Mapping
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
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-neutral-500 mb-1">Duration (min) *</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Marks/Q *</label>
                  <input
                    type="number"
                    value={formMarksPerQuestion}
                    onChange={(e) => setFormMarksPerQuestion(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Negative Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    value={formNegativeMarks}
                    onChange={(e) => setFormNegativeMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Pass % *</label>
                  <input
                    type="number"
                    value={formPassingPercent}
                    onChange={(e) => setFormPassingPercent(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Proctoring Security Policy *
                </label>
                <select
                  value={formPolicyId}
                  onChange={(e) => setFormPolicyId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  {policies.map((pol) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.name} ({pol.enabled ? 'Supervised' : 'Unproctored'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Questions Picker */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Question Bank Items ({formSelectedQuestionIds.length} Selected)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                  {availableQuestions.map((q) => {
                    const isSelected = formSelectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`flex items-center justify-between rounded-lg p-2 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-300'
                            : 'hover:bg-neutral-50 text-neutral-700 dark:hover:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        <div className="truncate max-w-md">
                          <span className="font-mono text-[10px] text-neutral-400 mr-2">{q.id}</span>
                          <span>{q.questionText}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-orange-500 focus:ring-orange-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsBuilderModalOpen(false)}
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
              {canPublish && (
                <button
                  type="button"
                  onClick={() => handleSave('PUBLISHED')}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Publish Test Paper
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
