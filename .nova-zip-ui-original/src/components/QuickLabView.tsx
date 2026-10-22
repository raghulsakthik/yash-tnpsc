import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Eye,
  Code2,
  Sparkles,
  CheckCircle,
  Layout,
  Layers,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickLabViewProps {
  onAddXp: (amount: number) => void;
}

interface CanvasBlock {
  id: string;
  type: 'header' | 'metric-cards' | 'hero' | 'activity' | 'cta';
  title: string;
}

export const QuickLabView: React.FC<QuickLabViewProps> = ({ onAddXp }) => {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([
    { id: 'b1', type: 'header', title: 'Top Navigation Bar with Logo & Greeting' },
    { id: 'b2', type: 'metric-cards', title: '3 Metric Quick-Cards Row' },
    { id: 'b3', type: 'hero', title: 'Continue Learning Split Hero Card' },
    { id: 'b4', type: 'activity', title: '365-Day Activity Heatmap' },
  ]);
  const [viewMode, setViewMode] = useState<'preview' | 'blueprint'>('preview');
  const [completed, setCompleted] = useState(false);

  const availableBlocks = [
    { type: 'header', label: 'Top Navigation Bar', icon: '🧭' },
    { type: 'metric-cards', label: '3 Metric Cards', icon: '📊' },
    { type: 'hero', label: 'Split Hero Card', icon: '🎯' },
    { type: 'activity', label: 'Activity Heatmap', icon: '🟩' },
    { type: 'cta', label: 'Bottom Action Banner', icon: '⚡' },
  ] as const;

  const handleAddBlock = (type: CanvasBlock['type'], label: string) => {
    const newBlock: CanvasBlock = {
      id: `b-${Date.now()}`,
      type,
      title: label,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCompleteLab = () => {
    setCompleted(true);
    onAddXp(200);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Quick Lab: Wireframe Prototyper
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Interactive visual sandbox: arrange wireframe blocks and evaluate layout balance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'preview'
                  ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('blueprint')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'blueprint'
                  ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Blueprint</span>
            </button>
          </div>

          {!completed ? (
            <button
              onClick={handleCompleteLab}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Submit Lab (+200 XP)</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Challenge Completed</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Toolbar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4.5 dark:border-neutral-800 dark:bg-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Component Library
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Click to insert wireframe structures into your canvas:
            </p>

            <div className="mt-3 space-y-2">
              {availableBlocks.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddBlock(item.type, item.label)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 p-2.5 text-left text-xs font-medium text-neutral-800 transition-colors hover:border-orange-400 hover:bg-orange-50/40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <Plus className="h-4 w-4 text-orange-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Structure Order */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4.5 dark:border-neutral-800 dark:bg-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Layer Hierarchy
              </h3>
              <span className="text-xs text-neutral-400">{blocks.length} blocks</span>
            </div>

            <div className="mt-3 space-y-2">
              {blocks.map((b, idx) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl bg-neutral-50 p-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <span className="truncate max-w-[180px]">
                    {idx + 1}. {b.title}
                  </span>
                  <button
                    onClick={() => handleRemoveBlock(b.id)}
                    className="text-neutral-400 hover:text-red-500"
                    title="Remove block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Canvas Area */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-800 dark:bg-neutral-900 min-h-[500px]">
            {viewMode === 'preview' ? (
              <div className="space-y-4">
                {blocks.map((block) => {
                  if (block.type === 'header') {
                    return (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 shadow-xs dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-orange-500 text-center font-bold text-white text-xs leading-6">
                              Y
                            </div>
                            <span className="font-bold text-xs text-neutral-800 dark:text-white">
                              Good Afternoon, Yashika
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <div className="h-5 w-20 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                            <div className="h-5 w-5 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === 'metric-cards') {
                    return (
                      <div key={block.id} className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-dashed border-orange-300 bg-white p-3 dark:border-orange-950 dark:bg-neutral-800">
                          <div className="text-[10px] font-bold text-orange-600">Module 4 of 6</div>
                          <div className="mt-1 h-2 rounded-full bg-orange-200 dark:bg-orange-950">
                            <div className="h-full w-2/3 rounded-full bg-orange-500" />
                          </div>
                        </div>
                        <div className="rounded-xl border border-dashed border-amber-300 bg-white p-3 dark:border-amber-950 dark:bg-neutral-800">
                          <div className="text-[10px] font-bold text-amber-600">🔥 14-Day Streak</div>
                          <div className="mt-1 h-2 rounded-full bg-amber-200 dark:bg-amber-950">
                            <div className="h-full w-4/5 rounded-full bg-amber-500" />
                          </div>
                        </div>
                        <div className="rounded-xl border border-dashed border-emerald-300 bg-white p-3 dark:border-emerald-950 dark:bg-neutral-800">
                          <div className="text-[10px] font-bold text-emerald-600">18 Labs Done</div>
                          <div className="mt-1 h-2 rounded-full bg-emerald-200 dark:bg-emerald-950">
                            <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === 'hero') {
                    return (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-5 rounded-xl bg-orange-600 p-4 text-white text-center">
                            <span className="text-[10px] rounded-full bg-white/20 px-2 py-0.5">Module 4</span>
                            <div className="my-2 font-bold text-xs">▶ Play Masterclass</div>
                            <span className="text-[9px] opacity-80">Advanced UI Design</span>
                          </div>
                          <div className="col-span-7 space-y-1.5">
                            <span className="text-[10px] text-orange-600 font-bold uppercase">Design & Tech</span>
                            <h4 className="font-bold text-xs text-neutral-800 dark:text-white">
                              Wireframing and Prototyping Masterclass
                            </h4>
                            <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div className="h-full w-[65%] rounded-full bg-orange-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === 'activity') {
                    return (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                          Learning Activity Grid (52-week timeline)
                        </div>
                        <div className="flex gap-1 overflow-x-hidden">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-1">
                              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800" />
                              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-500 dark:bg-emerald-600" />
                              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-900" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={block.id}
                      className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-center text-xs dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      {block.title}
                    </div>
                  );
                })}
              </div>
            ) : (
              <pre className="rounded-2xl bg-neutral-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
{`<!-- YASH Learning Hub Wireframe Structure -->
<Container class="grid grid-cols-12 gap-6">
  <!-- Left Nav (2 Cols) -->
  <Sidebar brand="YASH" avatar="Y" />

  <!-- Main Canvas (7 Cols) -->
  <MainSection>
${blocks.map((b) => `    <Component type="${b.type}" title="${b.title}" />`).join('\n')}
  </MainSection>

  <!-- Right Progress (3 Cols) -->
  <ProgressPanel student="Yashika" tier="Beginner" ring="concentric" />
</Container>`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
