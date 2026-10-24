import React, { useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Check,
  X,
  RefreshCw,
  Layers,
  FileCheck,
} from 'lucide-react';
import { AIContentProposal, AdminRole } from '../../types/admin';

interface ContentUploadAIViewProps {
  role: AdminRole;
  proposals: AIContentProposal[];
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onSimulateUpload: (fileName: string, subject: string) => void;
}

export const ContentUploadAIView: React.FC<ContentUploadAIViewProps> = ({
  role,
  proposals,
  onApproveProposal,
  onRejectProposal,
  onSimulateUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetSubject, setTargetSubject] = useState('Indian Polity & Constitution');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    'Document Ingestion & Text Extraction',
    'Semantic Classification & Syllabus Mapping',
    'Duplicate & Provenance Cross-Check',
    'Human Editorial Review Gate',
  ];

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActiveStep(1);

    setTimeout(() => {
      setActiveStep(2);
      setTimeout(() => {
        setActiveStep(3);
        setTimeout(() => {
          setIsProcessing(false);
          setActiveStep(0);
          onSimulateUpload(
            selectedFile?.name || 'Uploaded_Curriculum_Syllabus_Doc.pdf',
            targetSubject
          );
          setSelectedFile(null);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span>AI Content Ingestion & Editorial Verification Pipeline</span>
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Per specification rules, AI never directly publishes production curriculum. All extracted topics and PYQs pass through human approval gates.
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-4">
          Strict 8-Stage Content Ingestion Pipeline
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            '1. Upload',
            '2. Extract',
            '3. Classify',
            '4. Map to Syllabus',
            '5. Duplicate Check',
            '6. Validate',
            '7. Human Review',
            '8. Publish',
          ].map((stage, i) => (
            <React.Fragment key={stage}>
              <div
                className={`rounded-xl px-3 py-1.5 font-bold ${
                  i === 6
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 ring-2 ring-amber-400'
                    : i === 7
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {stage}
              </div>
              {i < 7 && <ArrowRight className="h-3 w-3 text-neutral-400 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-orange-500" />
            <span>Ingest Syllabus Document</span>
          </h3>
          <p className="text-xs text-neutral-500">
            Accepts PDF, DOCX, or scanned gazettes. The neural extraction pipeline will identify topics and formulate candidate concepts.
          </p>

          <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Target Subject
              </label>
              <select
                value={targetSubject}
                onChange={(e) => setTargetSubject(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="Indian Polity & Constitution">Indian Polity & Constitution</option>
                <option value="General Studies">General Studies</option>
                <option value="Aptitude & Mental Ability">Aptitude & Mental Ability</option>
                <option value="History & Culture of Tamil Nadu">History & Culture of Tamil Nadu</option>
              </select>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
              <UploadCloud className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <input
                type="file"
                id="file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-input"
                className="text-orange-600 font-bold hover:underline cursor-pointer dark:text-orange-400"
              >
                {selectedFile ? selectedFile.name : 'Select or drop curriculum file'}
              </label>
              <p className="mt-1 text-[11px] text-neutral-400">PDF, DOCX up to 50MB</p>
            </div>

            {isProcessing && (
              <div className="rounded-xl bg-purple-50 p-3 text-xs text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 space-y-1 animate-pulse">
                <div className="font-bold flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{steps[activeStep] || 'Processing document...'}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {isProcessing ? 'Processing Pipeline...' : 'Upload & Initiate Pipeline'}
            </button>
          </form>
        </div>

        {/* Proposals Pending Human Review Gate */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              AI Extractions Awaiting Editorial Review ({proposals.length})
            </h3>
            <span className="text-xs text-neutral-500">
              Gatekeeper: Human approval required before cohort release
            </span>
          </div>

          <div className="space-y-3">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {prop.originalFileName}
                    </span>
                    <span className="text-xs text-neutral-400">({prop.fileSize})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Confidence {prop.confidenceScore}%
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        prop.status === 'APPROVED_PROCEED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : prop.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {prop.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/40">
                  <div>
                    <span className="text-neutral-400">Classified Subject:</span>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {prop.detectedSubject}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Proposed Topic Attachment:</span>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {prop.matchedTopic} ({prop.isExistingTopicMatch ? 'Existing Topic' : 'New Topic'})
                    </div>
                  </div>
                </div>

                {prop.duplicateDetected && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>Duplicate Candidate Detected:</strong> {prop.duplicateNote}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Extracted {prop.extractedConceptsCount} concepts
                  </span>

                  {prop.status === 'PENDING_HUMAN_REVIEW' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveProposal(prop.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve & Map</span>
                      </button>
                      <button
                        onClick={() => onRejectProposal(prop.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
