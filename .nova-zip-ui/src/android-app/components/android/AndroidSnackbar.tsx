import React, { useEffect } from 'react';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';

export interface SnackbarMessage {
  id: string;
  text: string;
  type?: 'success' | 'xp' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface AndroidSnackbarProps {
  message: SnackbarMessage | null;
  onDismiss: () => void;
}

export const AndroidSnackbar: React.FC<AndroidSnackbarProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    if (!message) return;
    const duration = message.duration || 3200;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 w-full max-w-sm px-4 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-900/95 p-3.5 text-xs text-white shadow-xl backdrop-blur-md dark:bg-neutral-800/95 border border-neutral-700/50">
        <div className="flex items-center gap-2.5 min-w-0">
          {message.type === 'xp' ? (
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
          ) : message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
          )}
          <span className="truncate font-medium">{message.text}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {message.actionLabel && message.onAction && (
            <button
              onClick={() => {
                message.onAction?.();
                onDismiss();
              }}
              className="rounded-lg bg-orange-500/20 px-2.5 py-1 text-[11px] font-bold text-orange-400 hover:bg-orange-500/30 cursor-pointer"
            >
              {message.actionLabel}
            </button>
          )}

          <button
            onClick={onDismiss}
            className="rounded-full p-1 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
