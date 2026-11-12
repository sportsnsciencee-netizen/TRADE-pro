import React from 'react';
import { MarketEnvironment, PositionMetrics } from '../types/options';
import { ShieldCheck, ShieldAlert, Scale, Target, Percent, DollarSign } from 'lucide-react';

interface PositionMetricsCardsProps {
  metrics: PositionMetrics;
  environment: MarketEnvironment;
}

export const PositionMetricsCards: React.FC<PositionMetricsCardsProps> = ({
  metrics,
  environment
}) => {
  const fmt = (val: number | 'Unlimited') => {
    if (val === 'Unlimited') return 'Unlimited ∞';
    const sign = val > 0 ? '+' : '';
    return `${sign}${environment.currency}${Math.abs(Math.round(val)).toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Max Profit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Max Profit</span>
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-1">
          <div className={`text-base font-bold font-mono ${
            metrics.maxProfit === 'Unlimited' || (typeof metrics.maxProfit === 'number' && metrics.maxProfit > 0)
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {fmt(metrics.maxProfit)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">At expiration</span>
        </div>
      </div>

      {/* 2. Max Loss */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Max Loss</span>
          <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div className="mt-1">
          <div className={`text-base font-bold font-mono ${
            metrics.maxLoss === 'Unlimited' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-rose-600 dark:text-rose-300'
          }`}>
            {metrics.maxLoss === 'Unlimited' ? 'Unlimited Risk' : fmt(metrics.maxLoss)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">Max downside risk</span>
        </div>
      </div>

      {/* 3. Risk-Reward Ratio */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Risk / Reward</span>
          <Scale size={14} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="mt-1">
          <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-300">
            {metrics.riskRewardRatio}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">Theoretical payout</span>
        </div>
      </div>

      {/* 4. Breakevens */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Break-Even(s)</span>
          <Target size={14} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="mt-1">
          <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-300 truncate" title={metrics.breakevens.join(', ')}>
            {metrics.breakevens.length > 0 ? metrics.breakevens.join(' · ') : 'None'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">Zero P&L inflection</span>
        </div>
      </div>

      {/* 5. Probability of Profit (POP) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Prob. of Profit</span>
          <Percent size={14} className="text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-base font-bold font-mono ${
              metrics.probabilityOfProfit >= 65 ? 'text-emerald-600 dark:text-emerald-400' : metrics.probabilityOfProfit >= 45 ? 'text-cyan-600 dark:text-cyan-300' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {metrics.probabilityOfProfit.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-sans font-bold px-1 py-0.2 rounded ${
              metrics.probabilityOfProfit >= 65 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
            }`}>
              Chance of Profit
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">BSM log-normal density</span>
        </div>
      </div>

      {/* 6. Net Debit / Credit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm transition-colors">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs">
          <span className="font-medium">Net Premium</span>
          <DollarSign size={14} className="text-slate-600 dark:text-slate-300" />
        </div>
        <div className="mt-1">
          <div className={`text-base font-bold font-mono ${
            metrics.netDebitCredit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
          }`}>
            {metrics.netDebitCredit >= 0 ? 'Credit +' : 'Debit -'}
            {environment.currency}{Math.abs(Math.round(metrics.netDebitCredit)).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate">
            {metrics.netDebitCredit >= 0 ? 'Net Cash Received' : 'Entry Capital Required'}
          </span>
        </div>
      </div>
    </div>
  );
};
