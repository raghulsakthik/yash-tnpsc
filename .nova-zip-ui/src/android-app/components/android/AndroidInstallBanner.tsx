import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export const AndroidInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('nova_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Manual instruction toast for browsers without direct prompt
      alert('To install on Android: Tap the 3-dot browser menu and select "Install app" or "Add to Home screen".');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('nova_pwa_dismissed', 'true');
  };

  if (!isVisible && isDismissed) return null;

  return (
    <div className="relative border-b border-orange-200/80 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-2.5 text-white shadow-xs">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
            <Smartphone className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate">Install NOVA for Android</div>
            <div className="text-[11px] text-white/90 truncate">
              Offline syllabus access & daily notifications
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-orange-900 shadow-xs hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
