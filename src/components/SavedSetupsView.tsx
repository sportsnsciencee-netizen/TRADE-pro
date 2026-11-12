import React, { useState } from 'react';
import { SavedStrategy, OptionLeg, MarketEnvironment } from '../types/options';
import { Bookmark, FolderOpen, Trash2, Calendar, TrendingUp, Download, Upload, Plus } from 'lucide-react';
import { downloadTextContent } from '../utils/fileDownloader';

interface SavedSetupsViewProps {
  savedStrategies: SavedStrategy[];
  currentLegs: OptionLeg[];
  currentEnv: MarketEnvironment;
  onSaveCurrent: (name: string, description: string) => void;
  onLoadStrategy: (strategy: SavedStrategy) => void;
  onDeleteStrategy: (id: string) => void;
  onImportStrategies: (imported: SavedStrategy[]) => void;
  onSwitchToBuilder: () => void;
}

export const SavedSetupsView: React.FC<SavedSetupsViewProps> = ({
  savedStrategies,
  currentLegs,
  currentEnv,
  onSaveCurrent,
  onLoadStrategy,
  onDeleteStrategy,
  onImportStrategies,
  onSwitchToBuilder
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveCurrent(name.trim(), desc.trim());
    setName('');
    setDesc('');
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 2500);
  };

  const handleExportJson = async () => {
    try {
      const dataStr = JSON.stringify(savedStrategies, null, 2);
      const filename = `TradeLab_Saved_Strategies_${new Date().toISOString().slice(0, 10)}.json`;
      const res = await downloadTextContent(dataStr, filename, 'application/json');
      if (res.success) {
        setDownloadMsg(`Downloaded "${filename}" successfully!`);
        setTimeout(() => setDownloadMsg(null), 3000);
      }
    } catch (err) {
      console.error('Export failed', err);
    }
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
        console.error('Failed to import JSON', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Download Export Feedback Banner */}
      {downloadMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{downloadMsg}</span>
          <button type="button" onClick={() => setDownloadMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold px-1">×</button>
        </div>
      )}

      {/* Save current active setup banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Save Current Portfolio</h3>
          </div>
          <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300">
            Active: {currentEnv.symbol} ({currentLegs.filter(l => l.enabled).length} legs)
          </span>
        </div>

        <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full flex flex-col gap-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Portfolio Setup Name</label>
            <input
              type="text"
              placeholder="e.g. Iron Fly with OTM Hedge"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="flex-1 w-full flex flex-col gap-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Notes / Strategy Thesis</label>
            <input
              type="text"
              placeholder="e.g. For weekly theta harvesting, target +2% move"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={currentLegs.length === 0}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 disabled:opacity-50 text-slate-950 dark:text-white rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={14} />
            Save to LocalStorage
          </button>
        </form>

        {showSavedNotification && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-2 rounded-lg">
            Portfolio successfully saved to browser local storage.
          </div>
        )}
      </div>

      {/* List of saved strategies */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Saved Strategies Library</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage saved options portfolios, stress tests, and custom trading structures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Download size={13} /> Export JSON
            </button>
            <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer">
              <Upload size={13} /> Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedStrategies.map(strat => (
            <div
              key={strat.id}
              className="bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{strat.name}</h4>
                    {strat.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{strat.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded">
                    {strat.environment.symbol}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block font-sans">Spot Ref</span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{strat.environment.currency}{strat.environment.spotPrice}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block font-sans">Global IV</span>
                    <span className="text-amber-600 dark:text-amber-300 font-semibold">{strat.environment.globalIV}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block font-sans">Legs</span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{strat.legs.length} legs</span>
                  </div>
                </div>

                {/* Mini Leg List preview */}
                <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                  {strat.legs.map((leg, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded ${
                        leg.action === 'BUY'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900'
                      }`}
                    >
                      {leg.action} {leg.strike} {leg.type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-3">
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(strat.savedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeleteStrategy(strat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete strategy"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      onLoadStrategy(strat);
                      onSwitchToBuilder();
                    }}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-slate-950 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <FolderOpen size={13} />
                    Load to Workspace
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
