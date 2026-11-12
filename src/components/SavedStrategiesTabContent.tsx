import React from 'react';
import { SavedStrategy, OptionLeg, MarketEnvironment } from '../types/options';
import {
  Bookmark,
  Calendar,
  Trash2,
  FolderOpen,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface SavedStrategiesTabContentProps {
  savedStrategies: SavedStrategy[];
  currentLegs: OptionLeg[];
  environment: MarketEnvironment;
  onLoadStrategy: (strategy: SavedStrategy) => void;
  onDeleteStrategy: (id: string) => void;
  onOpenSavePrompt?: () => void;
  onSwitchToReadyMade: () => void;
  onSwitchToEditor: () => void;
}

export const SavedStrategiesTabContent: React.FC<SavedStrategiesTabContentProps> = ({
  savedStrategies,
  currentLegs,
  environment,
  onLoadStrategy,
  onDeleteStrategy,
  onOpenSavePrompt,
  onSwitchToReadyMade,
  onSwitchToEditor
}) => {
  return (
    <div className="p-3 sm:p-5 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Saved Strategies Library</h3>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {savedStrategies.length} Saved
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strategies saved in browser LocalStorage. Click any card to load it directly back into the Editor.
          </p>
        </div>

        {/* Action Button: Save Current Strategy */}
        {currentLegs.length > 0 && onOpenSavePrompt && (
          <button
            type="button"
            onClick={onOpenSavePrompt}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Bookmark size={13} />
            <span>Save Current ({currentLegs.length} Legs)</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {savedStrategies.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
            <Bookmark size={26} strokeWidth={1.75} />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No Saved Strategies Found</h4>
          <p className="text-xs text-slate-500 max-w-md mb-5">
            You haven't saved any custom strategies yet. Build a strategy in the Editor or pick a template, then click <strong>"Save Strategy"</strong> to store it in LocalStorage.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSwitchToReadyMade}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Browse Ready-Made
            </button>
            <button
              type="button"
              onClick={onSwitchToEditor}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Go to Editor</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Saved Strategies Grid (Sensibull/Zerodha Style) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {savedStrategies.map(strat => {
            const dateStr = new Date(strat.savedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={strat.id}
                onClick={() => {
                  onLoadStrategy(strat);
                  onSwitchToEditor();
                }}
                role="button"
                tabIndex={0}
                className="group border border-slate-200 hover:border-blue-500 rounded-xl p-4 bg-white hover:bg-blue-50/20 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative"
              >
                {/* Top Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {strat.name}
                      </h4>
                      {strat.description ? (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 font-sans">
                          {strat.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5">Custom saved options structure</p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                      {strat.environment.symbol}
                    </span>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 block font-sans">Spot at save</span>
                      <span className="font-semibold text-slate-900">
                        {strat.environment.currency}{strat.environment.spotPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 block font-sans">IV</span>
                      <span className="font-semibold text-amber-600">
                        {strat.environment.globalIV}%
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-400 block font-sans">Position</span>
                      <span className="font-semibold text-blue-600">
                        {strat.legs.length} Leg{strat.legs.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Legs breakdown tags */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {strat.legs.map((leg, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          leg.action === 'BUY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {leg.action} {leg.strike} {leg.type === 'CALL' ? 'CE' : leg.type === 'PUT' ? 'PE' : 'FUT'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar size={11} />
                    <span>{dateStr}</span>
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => onDeleteStrategy(strat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete saved strategy from LocalStorage"
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Load Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onLoadStrategy(strat);
                        onSwitchToEditor();
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <FolderOpen size={12} />
                      <span>Load in Editor</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
