import React, { useState } from 'react';
import { PriceAlert, MarketEnvironment, AlertCondition } from '../types/options';
import { X, Bell, BellRing, Plus, Trash2, CheckCircle2, RotateCcw, Volume2, VolumeX, Target } from 'lucide-react';

interface PriceAlertOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  environment: MarketEnvironment;
  whatIfTargetSpot: number;
  breakevens: number[];
  onAddAlert: (targetPrice: number, condition: AlertCondition, note: string) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const PriceAlertOverlay: React.FC<PriceAlertOverlayProps> = ({
  isOpen,
  onClose,
  alerts,
  environment,
  whatIfTargetSpot,
  breakevens,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onResetAlert,
  soundEnabled,
  onToggleSound
}) => {
  const [targetPrice, setTargetPrice] = useState<number>(() => Math.round(environment.spotPrice * 1.01));
  const [condition, setCondition] = useState<AlertCondition>('ABOVE_OR_EQUAL');
  const [note, setNote] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPrice <= 0) return;
    onAddAlert(targetPrice, condition, note.trim());
    setNote('');
  };

  const c = environment.currency;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Underlying Price Alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set alerts for {environment.symbol} (Current Spot: {c}{environment.spotPrice.toLocaleString()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-300'
                  : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
              title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-5">
          {/* Create Alert Form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus size={13} className="text-cyan-600 dark:text-cyan-400" />
              Set New Price Alert
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Target Price */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Target Price ({c})
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-cyan-700 dark:text-cyan-300 font-mono text-sm font-bold focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Trigger Condition */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Trigger Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ABOVE_OR_EQUAL">Rises to or Above (≥)</option>
                  <option value="BELOW_OR_EQUAL">Drops to or Below (≤)</option>
                  <option value="EXACT">Hits Exact Price (±0.1%)</option>
                </select>
              </div>
            </div>

            {/* Quick Fill Shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Quick fill:</span>
              <button
                type="button"
                onClick={() => setTargetPrice(Math.round(environment.spotPrice * 1.01))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-transparent"
              >
                +1% ({Math.round(environment.spotPrice * 1.01)})
              </button>
              <button
                type="button"
                onClick={() => setTargetPrice(Math.round(environment.spotPrice * 1.025))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-transparent"
              >
                +2.5% ({Math.round(environment.spotPrice * 1.025)})
              </button>
              <button
                type="button"
                onClick={() => setTargetPrice(Math.round(environment.spotPrice * 0.99))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-transparent"
              >
                -1% ({Math.round(environment.spotPrice * 0.99)})
              </button>
              <button
                type="button"
                onClick={() => setTargetPrice(Math.round(environment.spotPrice * 0.975))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-transparent"
              >
                -2.5% ({Math.round(environment.spotPrice * 0.975)})
              </button>
              {breakevens.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTargetPrice(breakevens[0])}
                  className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 rounded font-mono"
                >
                  BE ({breakevens[0]})
                </button>
              )}
              {whatIfTargetSpot !== environment.spotPrice && (
                <button
                  type="button"
                  onClick={() => setTargetPrice(whatIfTargetSpot)}
                  className="px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900 rounded font-mono"
                >
                  What-If ({whatIfTargetSpot})
                </button>
              )}
            </div>

            {/* Note input */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Alert Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Exit Bull Spread, Adjust Wing, Take Profit"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-slate-950 dark:text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Bell size={13} />
                Create Alert
              </button>
            </div>
          </form>

          {/* Existing Alerts List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">
                Configured Alerts ({alerts.length})
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-500">
                {alerts.filter(a => a.triggered).length} Triggered
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  No price alerts configured for {environment.symbol}.
                </div>
              ) : (
                alerts.map(alert => {
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        alert.triggered
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700/80'
                          : alert.isActive
                          ? 'bg-slate-50/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
                          : 'bg-slate-50/40 dark:bg-slate-950/30 border-slate-200 dark:border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleAlert(alert.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            alert.triggered
                              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                              : alert.isActive
                              ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                          }`}
                          title={alert.isActive ? 'Deactivate alert' : 'Activate alert'}
                        >
                          {alert.triggered ? <BellRing size={14} className="text-emerald-600 dark:text-emerald-300 animate-pulse" /> : <Bell size={14} />}
                        </button>

                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {c}{alert.targetPrice.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {alert.condition === 'ABOVE_OR_EQUAL'
                                ? '≥ Reaches'
                                : alert.condition === 'BELOW_OR_EQUAL'
                                ? '≤ Drops'
                                : '≈ Exact'}
                            </span>
                            {alert.triggered && (
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <CheckCircle2 size={10} /> Triggered
                              </span>
                            )}
                          </div>

                          {alert.note && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                              {alert.note}
                            </p>
                          )}

                          <div className="text-[10px] text-slate-500 font-mono">
                            {alert.symbol} · Created {new Date(alert.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {alert.triggered && (
                          <button
                            type="button"
                            onClick={() => onResetAlert(alert.id)}
                            className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Re-arm / Reset Alert"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteAlert(alert.id)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Delete Alert"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Alerts evaluate instantly on spot price updates</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
