import React, { useEffect } from 'react';
import { Download, CheckCircle2, AlertTriangle, X, FileCheck, ExternalLink } from 'lucide-react';

export interface DownloadNotification {
  id: string;
  type: 'success' | 'error' | 'permission';
  title: string;
  filename?: string;
  message: string;
}

interface DownloadToastProps {
  notification: DownloadNotification | null;
  onDismiss: () => void;
}

export const DownloadToast: React.FC<DownloadToastProps> = ({
  notification,
  onDismiss
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';

  return (
    <div className="fixed top-5 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-200 pointer-events-auto">
      <div
        className={`p-4 rounded-xl shadow-2xl border flex flex-col gap-2 transition-all ${
          isSuccess
            ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-emerald-500/10'
            : 'bg-white dark:bg-slate-900 border-rose-500 shadow-rose-500/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isSuccess
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isSuccess ? (
                <FileCheck size={18} strokeWidth={2.2} />
              ) : (
                <AlertTriangle size={18} strokeWidth={2.2} />
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{notification.title}</span>
                {isSuccess && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                )}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {notification.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
            aria-label="Dismiss download notification"
          >
            <X size={15} />
          </button>
        </div>

        {notification.filename && (
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="truncate max-w-[240px]">
              📁 {notification.filename}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[9px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 rounded">
              Saved
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
