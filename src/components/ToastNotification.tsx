import React from 'react';
import { PriceAlert, MarketEnvironment } from '../types/options';
import { BellRing, X, Check, ArrowRight } from 'lucide-react';

interface ToastNotificationProps {
  alerts: PriceAlert[];
  environment: MarketEnvironment;
  onDismiss: (id: string) => void;
  onOpenAlertsOverlay: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  alerts,
  environment,
  onDismiss,
  onOpenAlertsOverlay
}) => {
  // Only display recently triggered alerts
  const activeTriggered = alerts.filter(a => a.triggered && a.isActive);

  if (activeTriggered.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {activeTriggered.map(alert => {
        const conditionText =
          alert.condition === 'ABOVE_OR_EQUAL'
            ? 'rose to or exceeded'
            : alert.condition === 'BELOW_OR_EQUAL'
            ? 'fell to or below'
            : 'hit exact target';

        return (
          <div
            key={alert.id}
            className="pointer-events-auto bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 rounded-xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-300 dark:border-emerald-700/60">
                  <BellRing size={16} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Price Alert Triggered
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-medium">
                    {alert.symbol} @ {environment.currency}{environment.spotPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onDismiss(alert.id)}
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-sans">
              Market spot {conditionText} target of{' '}
              <span className="font-mono font-bold text-slate-950 dark:text-white">
                {environment.currency}{alert.targetPrice.toLocaleString()}
              </span>
              {alert.note && (
                <span className="block text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 italic">
                  "{alert.note}"
                </span>
              )}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500 font-mono">
                {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : 'Just now'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onOpenAlertsOverlay();
                    onDismiss(alert.id);
                  }}
                  className="text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                >
                  Manage Alerts <ArrowRight size={11} />
                </button>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-medium transition-colors border border-slate-200 dark:border-transparent"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
