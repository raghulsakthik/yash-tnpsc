import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Flame, FlaskConical, Lightbulb, Loader2, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { UserProfile } from '../types';
import { novaApi } from '../api/novaApi';

interface QuickLabViewProps { profile?: UserProfile | null; onAddXp: (amount: number) => void; }
interface Mode { slug: string; name: string; desc: string; recommended?: boolean; }
interface Challenge { token: string; prompt: string; revealPrompt?: string; hint?: string; options: string[]; memorize?: boolean; }
interface Stats { attempts: number; correct: number; accuracy: number; avgTimeMs?: number | null; lastAttemptAt?: string | null; modes?: Array<{mode:string; attempts:number; correct:number; accuracy:number; avgTimeMs:number|null}>; }

const MODE_ICONS: Record<string, string> = { 'quick-math':'⚡','number-rush':'🔢','percentage-rush':'％','fraction-lab':'½','missing-number':'?','memory-math':'🧠','formula-match':'ƒ' };

export const QuickLabView: React.FC<QuickLabViewProps> = ({ profile, onAddXp }) => {
  const [modes, setModes] = useState<Mode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mode, setMode] = useState('percentage-rush');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{correct:boolean; correctIndex:number} | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [session, setSession] = useState({attempts:0, correct:0});
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const learnerName = profile?.name || 'Learner';
  const accuracy = session.attempts ? Math.round(session.correct / session.attempts * 100) : 0;
  const modeStats = useMemo(() => stats?.modes?.find((x) => x.mode === mode), [stats, mode]);

  const loadStats = async () => { try { setStats(await novaApi.quickLabStats() as Stats); } catch {} };
  const loadChallenge = async (selectedMode = mode) => {
    setLoading(true); setError(null); setSelected(null); setResult(null); setHintVisible(false); setElapsed(0);
    try {
      const next = await novaApi.quickLabNext(selectedMode) as Challenge;
      setChallenge(next); setStartedAt(Date.now());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start Quick Lab'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let alive = true;
    Promise.all([novaApi.quickLabModes(), novaApi.quickLabStats()]).then(([m, s]) => {
      if (!alive) return;
      const list = (m as {modes:Mode[]}).modes || [];
      setModes(list); setStats(s as Stats);
      const preferred = list.find(x => x.recommended)?.slug || list[0]?.slug || 'percentage-rush';
      setMode(preferred);
    }).catch((e) => alive && setError(e instanceof Error ? e.message : 'Unable to load Quick Lab')).finally(() => alive && setLoading(false));
    return () => { alive = false; if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!challenge || result) return;
    timerRef.current = window.setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [challenge, result, startedAt]);

  const choose = async (index: number) => {
    if (!challenge || submitting || result) return;
    setSelected(index); setSubmitting(true); setError(null);
    try {
      const response = await novaApi.quickLabSubmit({ token: challenge.token, selectedIndex:index, mode, timeTakenMs:Date.now()-startedAt }) as {correct:boolean; correctIndex:number};
      setResult(response);
      setSession(prev => ({ attempts: prev.attempts + 1, correct: prev.correct + (response.correct ? 1 : 0) }));
      setStreak(prev => response.correct ? prev + 1 : 0);
      if (response.correct) onAddXp(10);
      await loadStats();
    } catch (e) { setError(e instanceof Error ? e.message : 'Answer could not be submitted'); setSelected(null); }
    finally { setSubmitting(false); }
  };

  const switchMode = (nextMode:string) => { setMode(nextMode); loadChallenge(nextMode); };
  const next = () => loadChallenge(mode);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-orange-500"/><h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">Quick Lab</h2></div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Fast maths drills that train accuracy, recall and exam speed — one fresh challenge at a time.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"><Flame className="h-3.5 w-3.5"/>{streak} session streak</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><Trophy className="h-3.5 w-3.5"/>{session.correct}/{session.attempts} today</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Accuracy', `${session.attempts ? accuracy : stats?.accuracy ?? 0}%`, 'Current session'], ['Solved', `${session.attempts + (stats?.attempts ?? 0)}`, 'All Quick Lab attempts'], ['Avg speed', stats?.avgTimeMs ? `${(stats.avgTimeMs/1000).toFixed(1)}s` : '—', 'Across attempts'], ['XP', `+${session.correct*10}`, 'This session']].map(([label,value,sub]) => (
          <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</div><div className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">{value}</div><div className="mt-1 text-[10px] text-neutral-500">{sub}</div></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Choose a drill</h3><span className="text-[10px] text-neutral-400">7 modes</span></div>
            <div className="space-y-2">
              {modes.map(item => <button key={item.slug} onClick={() => switchMode(item.slug)} className={`w-full rounded-xl border p-3 text-left transition-all ${mode===item.slug ? 'border-orange-400 bg-orange-50/70 dark:border-orange-700 dark:bg-orange-950/30' : 'border-neutral-200 hover:border-orange-200 dark:border-neutral-800'}`}>
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-base dark:bg-neutral-800">{MODE_ICONS[item.slug] || '✦'}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">{item.name}{item.recommended && <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-700">Recommended</span>}</span><span className="mt-0.5 block text-[10px] leading-4 text-neutral-500">{item.desc}</span></span></div>
              </button>)}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-orange-500"/><h3 className="text-xs font-bold text-neutral-800 dark:text-white">Your {modes.find(x=>x.slug===mode)?.name || 'mode'} stats</h3></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="text-lg font-bold">{modeStats?.accuracy ?? 0}%</div><div className="text-[9px] text-neutral-400">accuracy</div></div><div><div className="text-lg font-bold">{modeStats?.attempts ?? 0}</div><div className="text-[9px] text-neutral-400">attempts</div></div><div><div className="text-lg font-bold">{modeStats?.avgTimeMs ? `${(modeStats.avgTimeMs/1000).toFixed(1)}s` : '—'}</div><div className="text-[9px] text-neutral-400">avg speed</div></div></div>
          </div>
        </aside>

        <main className="lg:col-span-8">
          <div className="min-h-[500px] rounded-3xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-center justify-between"><div><span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{modes.find(x=>x.slug===mode)?.name || mode}</span><div className="mt-1 text-xs text-neutral-500">Hi {learnerName.split(' ')[0]}, beat your last answer.</div></div><div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-300"><Clock3 className="h-3.5 w-3.5"/>{(elapsed/1000).toFixed(1)}s</div></div>

              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-9">
                {loading || !challenge ? <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-500"/></div> : <>
                  {challenge.memorize && <div className="mb-5 rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><Sparkles className="mr-1 inline h-3.5 w-3.5"/>Memorize this before answering</div>}
                  <div className="min-h-[90px] text-center"><div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">{challenge.prompt}</div>{result && challenge.revealPrompt && <div className="mt-5 text-base font-semibold text-neutral-700 dark:text-neutral-300">{challenge.revealPrompt}</div>}</div>
                  {challenge.hint && <div className="mt-5 text-center"><button onClick={()=>setHintVisible(x=>!x)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600"><Lightbulb className="h-3.5 w-3.5"/>{hintVisible ? 'Hide hint' : 'Need a hint?'}</button>{hintVisible && <div className="mx-auto mt-2 max-w-md rounded-xl bg-orange-50 px-3 py-2 text-[11px] text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">{challenge.hint}</div>}</div>}
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">{challenge.options.map((option,index)=>{ const isSelected=selected===index; const isCorrect=result?.correctIndex===index; const wrong=isSelected && result && !result.correct; return <button key={`${option}-${index}`} disabled={!!result || submitting} onClick={()=>choose(index)} className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-semibold transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : wrong ? 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300' : isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-neutral-200 hover:border-orange-400 hover:bg-orange-50/40 dark:border-neutral-800'}`}><span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-xs dark:bg-neutral-800">{String.fromCharCode(65+index)}</span>{option}{isCorrect && <CheckCircle2 className="float-right mt-0.5 h-4 w-4"/>}</button>})}</div>
                  {result && <div className={`mt-6 rounded-2xl p-4 ${result.correct ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}><div className="flex items-center justify-between"><div><div className={`text-sm font-bold ${result.correct ? 'text-emerald-700' : 'text-red-700'}`}>{result.correct ? 'Correct — nice!' : 'Not quite. Learn from it and go again.'}</div><div className="mt-1 text-[11px] text-neutral-500">Answer locked server-side and graded by YASH.</div></div><button onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"><RotateCcw className="h-3.5 w-3.5"/>Next</button></div></div>}
                </>}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-400"><span>Fresh challenge • server generated • one-time answer token</span><span>{stats?.lastAttemptAt ? `Last: ${new Date(stats.lastAttemptAt).toLocaleDateString()}` : 'No previous attempts'}</span></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
