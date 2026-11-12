import React, { useState, useEffect } from 'react';
import { X, Bookmark, Check, Layers, AlertCircle } from 'lucide-react';
import { OptionLeg, MarketEnvironment } from '../types/options';

interface SaveStrategyPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  legs: OptionLeg[];
  environment: MarketEnvironment;
  onSave: (name: string, description: string) => void;
}

export const SaveStrategyPromptModal: React.FC<SaveStrategyPromptModalProps> = ({
  isOpen,
  onClose,
  legs,
  environment,
  onSave
}) => {
  const activeLegs = legs.filter(l => l.enabled);
  const defaultName = activeLegs.length > 0
    ? `${environment.symbol} ${activeLegs.length}-Leg Strategy`
    : `${environment.symbol} Custom Strategy`;

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(
        activeLegs.length > 0
          ? `${environment.symbol} ${activeLegs.length}-Leg Strategy`
          : `${environment.symbol} Custom Strategy`
      );
      setDescription('');
      setIsSaved(false);
      setError(null);
    }
  }, [isOpen, environment.symbol, activeLegs.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for your strategy.');
      return;
    }
    if (legs.length === 0) {
      setError('No trades to save. Please add at least one trade leg first.');
      return;
    }

    onSave(name.trim(), description.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bookmark size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Save Strategy</h3>
              <p className="text-xs text-slate-500">Save current trades array to LocalStorage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Setup Summary Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-slate-900">{environment.symbol}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">Spot ₹{environment.spotPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              <Layers size={13} />
              <span>{legs.length} Legs</span>
            </div>
          </div>

          {/* Strategy Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Strategy Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. NIFTY Weekly Iron Condor"
              autoFocus
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          {/* Notes / Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Notes / Strategy Thesis (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Range-bound play targeting weekly Theta decay with OTM hedges"
              rows={2}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none font-sans"
            />
          </div>

          {/* Legs Preview */}
          {legs.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
              {legs.map(l => (
                <span
                  key={l.id}
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    l.action === 'BUY'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {l.action} {l.strike} {l.type === 'CALL' ? 'CE' : l.type === 'PUT' ? 'PE' : 'FUT'}
                </span>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaved || legs.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Bookmark size={14} />
                  <span>Save to LocalStorage</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
