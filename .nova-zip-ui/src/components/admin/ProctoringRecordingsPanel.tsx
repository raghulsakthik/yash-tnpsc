import React, { useEffect, useState } from 'react';
import { Camera, Monitor, ShieldCheck, Clock, Download } from 'lucide-react';
import { novaApi } from '../../api/novaApi';

interface SessionRow {
  testId: string;
  status: string;
  hasCamera: boolean;
  hasScreen: boolean;
  startedAt: string;
  endedAt: string | null;
  learnerName: string;
  testStatus: string;
  score: number | null;
  questionCount: number;
  eventCount: number;
}

interface SessionDetail extends Omit<SessionRow, 'testId' | 'eventCount'> {
  events: Array<{ type: string; metadata: Record<string, unknown>; at: string }>;
}

/**
 * Real admin review of recorded proctoring sessions -- GET
 * /api/admin/proctoring/sessions (+ /:testId for the event log), video
 * streamed from /api/admin/proctoring/media/:testId/:stream. The backend
 * for this has existed since the proctoring recorder itself was wired up;
 * it just was never surfaced in the Admin Portal UI before now. Sits above
 * ProctoringHubView's policy/decision workflow (still local/mock -- there's
 * no real "decide" endpoint on the backend yet), which is unchanged.
 */
export const ProctoringRecordingsPanel: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTestId, setOpenTestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    novaApi
      .adminProctoringSessions()
      .then((res) => {
        setSessions(res.sessions || []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load proctoring sessions'))
      .finally(() => setLoading(false));
  }, []);

  const openSession = (testId: string) => {
    if (openTestId === testId) {
      setOpenTestId(null);
      setDetail(null);
      return;
    }
    setOpenTestId(testId);
    setDetail(null);
    setDetailError(null);
    novaApi
      .adminProctoringSession(testId)
      .then((res) => setDetail(res as SessionDetail))
      .catch((err) => setDetailError(err instanceof Error ? err.message : 'Could not load session detail'));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span>Recorded Proctoring Sessions</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Real camera/screen recordings and event logs from supervised tests -- every session a learner has actually taken.
        </p>
      </div>

      {loading && <p className="text-xs text-neutral-500">Loading…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-xs text-neutral-500">No proctored test attempts yet.</p>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.testId} className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
            <button
              onClick={() => openSession(s.testId)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                  <span>{s.learnerName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === 'RECORDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.startedAt).toLocaleString()}</span>
                  {s.hasCamera && <span className="flex items-center gap-1"><Camera className="h-3 w-3" />Camera</span>}
                  {s.hasScreen && <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />Screen</span>}
                  <span>{s.eventCount} event{s.eventCount === 1 ? '' : 's'}</span>
                  {s.score != null && <span>Score {s.score}/{s.questionCount}</span>}
                </div>
              </div>
              <span className="text-xs font-semibold text-orange-600">{openTestId === s.testId ? 'Close' : 'Review'}</span>
            </button>

            {openTestId === s.testId && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 p-4 space-y-4">
                {detailError && <p className="text-xs text-red-600">{detailError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {s.hasCamera && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Camera</span>
                        <a href={`/api/admin/proctoring/media/${s.testId}/camera?download=1`} className="flex items-center gap-1 text-[11px] text-orange-600 hover:underline">
                          <Download className="h-3 w-3" />Download
                        </a>
                      </div>
                      <video controls className="w-full rounded-xl bg-black" src={`/api/admin/proctoring/media/${s.testId}/camera`} />
                    </div>
                  )}
                  {s.hasScreen && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Screen</span>
                        <a href={`/api/admin/proctoring/media/${s.testId}/screen?download=1`} className="flex items-center gap-1 text-[11px] text-orange-600 hover:underline">
                          <Download className="h-3 w-3" />Download
                        </a>
                      </div>
                      <video controls className="w-full rounded-xl bg-black" src={`/api/admin/proctoring/media/${s.testId}/screen`} />
                    </div>
                  )}
                  {!s.hasCamera && !s.hasScreen && (
                    <p className="text-xs text-neutral-500 col-span-2">No recording was captured for this session (proctoring was declined or unavailable).</p>
                  )}
                </div>

                {detail?.events && detail.events.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Event log</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.events.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 border-b border-neutral-50 dark:border-neutral-800 py-1">
                          <span className="font-mono">{e.type}</span>
                          <span>{new Date(e.at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
