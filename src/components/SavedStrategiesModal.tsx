import React, { useState } from 'react';
import { SavedStrategy, OptionLeg, MarketEnvironment } from '../types/options';
import { X, Bookmark, Download, Upload, Trash2, FolderOpen, Calendar, ArrowRight, Check } from 'lucide-react';

interface SavedStrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedStrategies: SavedStrategy[];
  currentLegs: OptionLeg[];
  currentEnv: MarketEnvironment;
  onSaveCurrent: (name: string, description: string) => void;
  onLoadStrategy: (strategy: SavedStrategy) => void;
  onDeleteStrategy: (id: string) => void;
  onImportStrategies: (imported: SavedStrategy[]) => void;
}

export const SavedStrategiesModal: React.FC<SavedStrategiesModalProps> = ({
  isOpen,
  onClose,
  savedStrategies,
  currentLegs,
  currentEnv,
  onSaveCurrent,
  onLoadStrategy,
  onDeleteStrategy,
  onImportStrategies
}) => {
  const [strategyName, setStrategyName] = useState('');
  const [strategyDesc, setStrategyDesc] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyName.trim()) return;
    onSaveCurrent(strategyName.trim(), strategyDesc.trim());
    setStrategyName('');
    setStrategyDesc('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedStrategies, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `optiquant_strategies_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportStrategies(parsed);
        }
      } catch (err) {
        console.error('Failed to parse strategy JSON', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Saved Strategy Portfolios</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-6">
          {/* Section 1: Save Current Setup */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Save Current Active Setup</span>
              <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400">
                {currentEnv.symbol} · {currentLegs.filter(l => l.enabled).length} Active Legs
              </span>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Strategy Name (e.g. NIFTY Weekly Hedged Condor)"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Notes / Market thesis (optional)"
                  value={strategyDesc}
                  onChange={(e) => setStrategyDesc(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Saves spot price ({currentEnv.spotPrice}), IV ({currentEnv.globalIV}%), and all configured option legs to LocalStorage.
                </span>
                <button
                  type="submit"
                  disabled={currentLegs.length === 0}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 disabled:opacity-50 text-slate-950 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {saveSuccess ? (
                    <>
                      <Check size={13} className="text-emerald-700 dark:text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={13} />
                      <span>Save Portfolio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Saved Strategies List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">
                Your Saved Portfolios ({savedStrategies.length})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJson}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                  title="Export all strategies to JSON"
                >
                  <Download size={12} /> Export JSON
                </button>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload size={12} /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {savedStrategies.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  No saved strategies found. Create and save your first portfolio above.
                </div>
              ) : (
                savedStrategies.map(strat => (
                  <div
                    key={strat.id}
                    className="p-3 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {strat.name}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-cyan-800 dark:text-cyan-300">
                          {strat.environment.symbol} @ {strat.environment.currency}{strat.environment.spotPrice}
                        </span>
                      </div>
                      {strat.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {strat.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(strat.savedAt).toLocaleDateString()}
                        </span>
                        <span>·</span>
                        <span>{strat.legs.length} legs</span>
                        <span>·</span>
                        <span>IV: {strat.environment.globalIV}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onLoadStrategy(strat);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-slate-200 dark:border-transparent"
                        title="Load this portfolio into editor"
                      >
                        <FolderOpen size={13} />
                        Load
                      </button>
                      <button
                        onClick={() => onDeleteStrategy(strat.id)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        title="Delete saved setup"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
