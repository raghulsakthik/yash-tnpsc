import React, { useState } from 'react';
import { Download, ExternalLink, Link2, FileText, CheckCircle, Sparkles } from 'lucide-react';
import { ResourceItem } from '../types';

interface ResourcesViewProps {
  resources: ResourceItem[];
  defaultTab?: 'all' | 'links' | 'download';
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  resources,
  defaultTab = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'links' | 'download'>(defaultTab);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  const filtered = resources.filter((item) => {
    if (activeTab === 'links') return item.type === 'Link';
    if (activeTab === 'download') return item.type === 'Download';
    return true;
  });

  const handleDownload = (id: string, title: string) => {
    setDownloadedIds((prev) => [...prev, id]);
    // Create quick text blob for download
    const blob = new Blob([`Resource: ${title}\nDownloaded from YASH Learning Hub.`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              Design & Dev Resources
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Curated Figma toolkits, cheat sheets, guidelines, and downloadable assets
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            All Resources
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'links'
                ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Link's</span>
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'download'
                ? 'bg-white text-orange-600 shadow-xs dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Grid of Resources */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {filtered.map((item) => {
          const isDownloaded = downloadedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                    {item.category}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    {item.sizeOrDomain}
                  </span>
                </div>

                <h3 className="mt-2.5 text-base font-bold text-neutral-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {item.type === 'Download' ? (
                  <button
                    onClick={() => handleDownload(item.id, item.title)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 active:scale-98"
                  >
                    {isDownloaded ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-white" />
                        <span>Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Download Asset</span>
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:border-orange-400 hover:bg-orange-50/50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <span>Visit Reference</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
