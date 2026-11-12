import React, { useState } from 'react';
import { X, Check, Calculator, IndianRupee } from 'lucide-react';
import { ManualPnLEntry } from '../types/options';

interface ManualPnLModalProps {
  isOpen: boolean;
  onClose: () => void;
  manualPnL: ManualPnLEntry;
  onSave: (entry: ManualPnLEntry) => void;
  currency: string;
}

export const ManualPnLModal: React.FC<ManualPnLModalProps> = ({
  isOpen,
  onClose,
  manualPnL,
  onSave,
  currency
}) => {
  const [amount, setAmount] = useState<number>(manualPnL.amount || 0);
  const [description, setDescription] = useState<string>(manualPnL.description || '');
  const [enabled, setEnabled] = useState<boolean>(manualPnL.enabled ?? true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      amount,
      description: description.trim(),
      enabled
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manual P&L Adjustment</h3>
              <p className="text-xs text-slate-500">Add booked past trade P&L or manual cash adjustments</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Manual P&L Amount ({currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder="0.00 (e.g. +2500 or -1200)"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Enter positive value for profit, negative for loss.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Description / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rolled morning CE trade profit, brokerage"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-xs font-medium text-slate-700">
              Enable manual P&L calculation in active strategy
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
