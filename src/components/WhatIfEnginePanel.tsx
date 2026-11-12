import React from 'react';
import { MarketEnvironment, OptionLeg, PositionMetrics, WhatIfParameters, LegValuation } from '../types/options';
import { Lock, Sparkles, TrendingUp, TrendingDown, Clock, Activity, RotateCcw } from 'lucide-react';

interface WhatIfEnginePanelProps {
  whatIf: WhatIfParameters;
  onChangeWhatIf: (params: WhatIfParameters) => void;
  environment: MarketEnvironment;
  legs: OptionLeg[];
  metrics: PositionMetrics;
  valuations: LegValuation[];
  onLockAtTarget: () => void;
}

export const WhatIfEnginePanel: React.FC<WhatIfEnginePanelProps> = ({
  whatIf,
  onChangeWhatIf,
  environment,
  legs,
  metrics,
  valuations,
  onLockAtTarget
}) => {
  // Compute earliest and latest expiry
  const activeLegs = legs.filter(l => l.enabled);
  const minExpiry = activeLegs.length > 0
    ? activeLegs.reduce((min, l) => l.expiry < min ? l.expiry : min, activeLegs[0].expiry)
    : environment.baseDate;

  // Percentage change of target spot relative to base spot
  const spotChangePct = ((whatIf.targetSpot - environment.spotPrice) / environment.spotPrice) * 100;

  // Quick date jump helpers
  const setQuickDate = (daysAhead: number) => {
    const d = new Date(environment.baseDate);
    d.setDate(d.getDate() + daysAhead);
    const dateStr = d.toISOString().slice(0, 10);
    onChangeWhatIf({ ...whatIf, targetDate: dateStr });
  };

  const fmtCurrency = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${environment.currency}${Math.round(val).toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm transition-colors">
      {/* Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              What-If Stress Test & Valuation Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulate hypothetical spot levels, future calendar dates, and implied volatility shocks.
            </p>
          </div>
        </div>

        {/* Lock Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onChangeWhatIf({
                targetDate: environment.baseDate,
                targetSpot: environment.spotPrice,
                targetIVShift: 0
              });
            }}
            className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 font-medium"
            title="Reset What-If to today's spot"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          <button
            onClick={onLockAtTarget}
            disabled={activeLegs.length === 0}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            title="Locks the theoretical valuations at target parameters as active entry values"
          >
            <Lock size={13} />
            <span>Lock Legs at Target</span>
          </button>
        </div>
      </div>

      {/* Main Sliders and Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Target Spot Price Control */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hypothetical Target Spot</span>
            <span className={`text-xs font-mono font-bold ${spotChangePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {spotChangePct >= 0 ? '+' : ''}{spotChangePct.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              value={whatIf.targetSpot}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onChangeWhatIf({ ...whatIf, targetSpot: val });
                }
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-cyan-700 dark:text-cyan-300 font-mono text-base font-bold focus:outline-none focus:border-cyan-500 shadow-xs"
            />
          </div>

          {/* Slider */}
          <div className="flex flex-col gap-1">
            <input
              type="range"
              min={Math.round(environment.spotPrice * 0.75)}
              max={Math.round(environment.spotPrice * 1.25)}
              step={Math.max(1, Math.round(environment.spotPrice * 0.002))}
              value={whatIf.targetSpot}
              onChange={(e) => onChangeWhatIf({ ...whatIf, targetSpot: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-25% ({Math.round(environment.spotPrice * 0.75)})</span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Current ({environment.spotPrice})</span>
              <span>+25% ({Math.round(environment.spotPrice * 1.25)})</span>
            </div>
          </div>
        </div>

        {/* 2. Target Valuation Date */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Valuation Date</span>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
              <Clock size={12} />
              {(() => {
                const diffDays = Math.round(
                  (new Date(whatIf.targetDate).getTime() - new Date(environment.baseDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return diffDays === 0 ? 'Today (T+0)' : `+${diffDays} Days`;
              })()}
            </span>
          </div>

          <input
            type="date"
            value={whatIf.targetDate}
            min={environment.baseDate}
            onChange={(e) => onChangeWhatIf({ ...whatIf, targetDate: e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-cyan-500 shadow-xs"
          />

          {/* Quick jump pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onChangeWhatIf({ ...whatIf, targetDate: environment.baseDate })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                whatIf.targetDate === environment.baseDate
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setQuickDate(1)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded text-[11px] font-mono border border-slate-200 dark:border-transparent"
            >
              +1D
            </button>
            <button
              onClick={() => setQuickDate(3)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded text-[11px] font-mono border border-slate-200 dark:border-transparent"
            >
              +3D
            </button>
            <button
              onClick={() => setQuickDate(7)}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded text-[11px] font-mono border border-slate-200 dark:border-transparent"
            >
              +7D
            </button>
            <button
              onClick={() => onChangeWhatIf({ ...whatIf, targetDate: minExpiry })}
              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded text-[11px] font-mono font-medium"
            >
              At Expiry
            </button>
          </div>
        </div>

        {/* 3. Implied Volatility Stress (IV Shock) */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">IV Shock / Expansion</span>
            <span className={`text-xs font-mono font-bold ${
              whatIf.targetIVShift > 0 ? 'text-amber-600 dark:text-amber-400' : whatIf.targetIVShift < 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
              {whatIf.targetIVShift > 0 ? `+${whatIf.targetIVShift}%` : `${whatIf.targetIVShift}%`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-15"
              max="25"
              step="1"
              value={whatIf.targetIVShift}
              onChange={(e) => onChangeWhatIf({ ...whatIf, targetIVShift: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500 font-mono">Crush: -15%</span>
            <span className="text-amber-700 dark:text-amber-300 font-mono font-semibold">
              Eff. IV: {(environment.globalIV + whatIf.targetIVShift).toFixed(1)}%
            </span>
            <span className="text-slate-500 font-mono">Spike: +25%</span>
          </div>
        </div>
      </div>

      {/* Target Result Banner: Total P&L and Theta Decay Breakdown */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Total Combined Target P&L</span>
            <div className={`text-xl font-mono font-bold flex items-center gap-1.5 ${
              metrics.totalTargetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {metrics.totalTargetPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {fmtCurrency(metrics.totalTargetPnL)}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
              <Clock size={11} className="text-amber-600 dark:text-amber-400" />
              Isolated Theta Decay Effect
            </span>
            <div className={`text-sm font-mono font-bold ${
              metrics.totalThetaDecay >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {fmtCurrency(metrics.totalThetaDecay)}
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                (pure calendar passage)
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
              <Activity size={11} className="text-cyan-600 dark:text-cyan-400" />
              Delta & Vega Movement
            </span>
            <div className={`text-sm font-mono font-bold ${
              (metrics.totalTargetPnL - metrics.totalThetaDecay) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fmtCurrency(metrics.totalTargetPnL - metrics.totalThetaDecay)}
            </div>
          </div>
        </div>

        {/* Quick summary status */}
        <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
          <div>Valuation at {whatIf.targetSpot} on {whatIf.targetDate}</div>
          <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
            {activeLegs.length} Active Legs Evaluated via BSM Engine
          </div>
        </div>
      </div>
    </div>
  );
};
