import React, { useState, useMemo } from 'react';
import { MarketEnvironment, PositionMetrics, OptionLeg, LegValuation } from '../types/options';
import { Activity, Clock, Zap, BarChart2, Waves, Sliders, CheckSquare, Square, Eye, EyeOff, RotateCcw, ArrowRightLeft } from 'lucide-react';

interface GreeksOverviewProps {
  metrics: PositionMetrics;
  environment: MarketEnvironment;
  legs?: OptionLeg[];
  valuations?: LegValuation[];
  onToggleLeg?: (legId: string) => void;
}

type IsolationMode = 'summary' | 'delta' | 'gamma';
type LegFilter = 'ALL' | 'CALLS' | 'PUTS' | 'LONG' | 'SHORT';

export const GreeksOverview: React.FC<GreeksOverviewProps> = ({
  metrics,
  environment,
  legs = [],
  valuations = [],
  onToggleLeg
}) => {
  const c = environment.currency;
  const [mode, setMode] = useState<IsolationMode>('summary');
  const [legFilter, setLegFilter] = useState<LegFilter>('ALL');
  // Local isolated exclusion set
  const [isolatedLegIds, setIsolatedLegIds] = useState<string[]>([]);

  const activeLegs = useMemo(() => legs.filter(l => l.enabled), [legs]);

  // Handle local isolation selection
  const isLegIsolatedActive = (legId: string) => {
    if (isolatedLegIds.length === 0) return true;
    return isolatedLegIds.includes(legId);
  };

  const handleToggleIsolation = (legId: string) => {
    if (isolatedLegIds.length === 0) {
      const allOtherIds = activeLegs.map(l => l.id).filter(id => id !== legId);
      setIsolatedLegIds(allOtherIds);
    } else if (isolatedLegIds.includes(legId)) {
      const next = isolatedLegIds.filter(id => id !== legId);
      setIsolatedLegIds(next);
    } else {
      setIsolatedLegIds([...isolatedLegIds, legId]);
    }
  };

  const handleSoloLeg = (legId: string) => {
    setIsolatedLegIds([legId]);
  };

  const handleResetIsolation = () => {
    setIsolatedLegIds([]);
    setLegFilter('ALL');
  };

  // Filtered legs based on category filter
  const displayedLegs = useMemo(() => {
    return activeLegs.filter(leg => {
      if (legFilter === 'CALLS') return leg.type === 'CALL';
      if (legFilter === 'PUTS') return leg.type === 'PUT';
      if (legFilter === 'LONG') return leg.action === 'BUY';
      if (legFilter === 'SHORT') return leg.action === 'SELL';
      return true;
    });
  }, [activeLegs, legFilter]);

  // Compute isolated Delta and Gamma sums
  const { isolatedDelta, isolatedGamma, maxAbsDelta, maxAbsGamma } = useMemo(() => {
    let sumD = 0;
    let sumG = 0;
    let maxD = 0.01;
    let maxG = 0.0001;

    activeLegs.forEach(leg => {
      const val = valuations.find(v => v.legId === leg.id);
      if (!val) return;

      const d = Math.abs(val.greeks.delta);
      const g = Math.abs(val.greeks.gamma);
      if (d > maxD) maxD = d;
      if (g > maxG) maxG = g;

      if (isLegIsolatedActive(leg.id)) {
        sumD += val.greeks.delta;
        sumG += val.greeks.gamma;
      }
    });

    return {
      isolatedDelta: sumD,
      isolatedGamma: sumG,
      maxAbsDelta: maxD,
      maxAbsGamma: maxG
    };
  }, [activeLegs, valuations, isolatedLegIds]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm transition-colors">
      {/* Top Header & Interactive Mode Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-cyan-600 dark:text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Position Greeks Analytics
              {isolatedLegIds.length > 0 && (
                <span className="text-[10px] font-mono font-semibold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.2 rounded">
                  {isolatedLegIds.length}/{activeLegs.length} Isolated
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Measure sensitivity to price, rate of change, decay, and volatility.
            </p>
          </div>
        </div>

        {/* Mode Selector Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setMode('summary')}
            className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              mode === 'summary'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Greeks (Summary)
          </button>
          <button
            onClick={() => setMode('delta')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'delta'
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-300 dark:border-cyan-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300'
            }`}
          >
            <span>Isolate Delta (Δ)</span>
            <span className={`text-[10px] font-mono px-1 rounded ${isolatedDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
              {isolatedDelta >= 0 ? '+' : ''}{isolatedDelta.toFixed(2)}
            </span>
          </button>
          <button
            onClick={() => setMode('gamma')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              mode === 'gamma'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-300 dark:border-indigo-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
            }`}
          >
            <span>Isolate Gamma (Γ)</span>
            <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 px-1 rounded font-bold">
              {isolatedGamma >= 0 ? '+' : ''}{isolatedGamma.toFixed(4)}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Standard 5-Greeks High-Level Summary */}
      {mode === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Delta */}
          <div
            onClick={() => setMode('delta')}
            className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500 dark:hover:border-cyan-700/60 cursor-pointer rounded-lg p-3 flex flex-col gap-1 transition-all group"
            title="Click to isolate leg-by-leg Delta contributions"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">Delta (Δ)</span>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">Isolate →</span>
            </div>
            <div className={`text-lg font-bold font-mono ${metrics.netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {metrics.netDelta >= 0 ? '+' : ''}{metrics.netDelta.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500">
              {metrics.netDelta > 0.05
                ? `Bullish: gains ${c}${Math.abs(Math.round(metrics.netDelta * 1))} per 1 unit asset rise`
                : metrics.netDelta < -0.05
                ? `Bearish: gains ${c}${Math.abs(Math.round(metrics.netDelta * 1))} per 1 unit asset fall`
                : 'Delta Neutral: balanced price exposure'}
            </p>
          </div>

          {/* Gamma */}
          <div
            onClick={() => setMode('gamma')}
            className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 dark:hover:border-indigo-700/60 cursor-pointer rounded-lg p-3 flex flex-col gap-1 transition-all group"
            title="Click to isolate leg-by-leg Gamma curvature"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">Gamma (Γ)</span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Isolate →</span>
            </div>
            <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-300">
              {metrics.netGamma >= 0 ? '+' : ''}{metrics.netGamma.toFixed(4)}
            </div>
            <p className="text-[11px] text-slate-500">
              Acceleration: Delta shifts by {(metrics.netGamma * 10).toFixed(3)} per 10 pt move
            </p>
          </div>

          {/* Theta */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Theta (Θ)</span>
              <Clock size={12} className="text-amber-500 dark:text-amber-400" />
            </div>
            <div className={`text-lg font-bold font-mono ${metrics.netTheta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {metrics.netTheta >= 0 ? '+' : ''}{c}{Math.round(metrics.netTheta).toLocaleString()}/day
            </div>
            <p className="text-[11px] text-slate-500">
              {metrics.netTheta >= 0
                ? `Decay is favorable (+${c}${Math.abs(Math.round(metrics.netTheta))} daily)`
                : `Decay burns portfolio (-${c}${Math.abs(Math.round(metrics.netTheta))} daily)`}
            </p>
          </div>

          {/* Vega */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Vega (ν)</span>
              <Waves size={12} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className={`text-lg font-bold font-mono ${metrics.netVega >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {metrics.netVega >= 0 ? '+' : ''}{c}{Math.round(metrics.netVega).toLocaleString()}/1% IV
            </div>
            <p className="text-[11px] text-slate-500">
              P&L sensitivity per 1 percentage point IV shift
            </p>
          </div>

          {/* Rho */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rho (ρ)</span>
              <Zap size={12} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-300">
              {metrics.netRho >= 0 ? '+' : ''}{c}{Math.round(metrics.netRho).toLocaleString()}/1% Rate
            </div>
            <p className="text-[11px] text-slate-500">
              Sensitivity to changes in risk-free interest rates
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: Interactive Delta (Δ) Isolation & Visualization */}
      {mode === 'delta' && (
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-cyan-200 dark:border-cyan-900/60 rounded-xl p-4 flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Subheader and Filter Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 block uppercase tracking-wider">
                  Isolated Net Delta
                </span>
                <div className={`text-2xl font-bold font-mono ${isolatedDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isolatedDelta >= 0 ? '+' : ''}{isolatedDelta.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                    ({isolatedDelta > 0.1 ? 'Net Bullish' : isolatedDelta < -0.1 ? 'Net Bearish' : 'Delta Neutral'})
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-mono">
                <div>Baseline Portfolio Δ: <span className="text-slate-900 dark:text-white font-bold">{metrics.netDelta.toFixed(2)}</span></div>
                <div>Variance: <span className={isolatedDelta - metrics.netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                  {(isolatedDelta - metrics.netDelta) >= 0 ? '+' : ''}{(isolatedDelta - metrics.netDelta).toFixed(2)}
                </span></div>
              </div>
            </div>

            {/* Sub-Filters and Reset */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                {(['ALL', 'CALLS', 'PUTS', 'LONG', 'SHORT'] as LegFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setLegFilter(f)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      legFilter === f ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {isolatedLegIds.length > 0 && (
                <button
                  onClick={handleResetIsolation}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors font-medium"
                  title="Reset to include all active legs"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Interactive Leg Contribution Rows */}
          <div className="flex flex-col gap-2.5">
            {displayedLegs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No active legs matching current filter criteria.
              </div>
            ) : (
              displayedLegs.map(leg => {
                const val = valuations.find(v => v.legId === leg.id);
                if (!val) return null;

                const isIncluded = isLegIsolatedActive(leg.id);
                const legDelta = val.greeks.delta;
                const absDelta = Math.abs(legDelta);
                const barWidthPct = Math.min(100, Math.max(3, (absDelta / maxAbsDelta) * 100));

                return (
                  <div
                    key={leg.id}
                    className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isIncluded
                        ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 shadow-xs'
                        : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/40 opacity-40'
                    }`}
                  >
                    {/* Left: Leg Info & Toggles */}
                    <div className="flex items-center gap-2.5 min-w-[200px]">
                      <button
                        onClick={() => handleToggleIsolation(leg.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={isIncluded ? 'Click to exclude this leg from Delta' : 'Click to include this leg'}
                      >
                        {isIncluded ? (
                          <CheckSquare size={16} className="text-cyan-600 dark:text-cyan-400" />
                        ) : (
                          <Square size={16} className="text-slate-400 dark:text-slate-600" />
                        )}
                      </button>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            leg.action === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {leg.action}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            {leg.strike} {leg.type}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({leg.lots}x {leg.lotSize})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {leg.name || `Strike ${leg.strike}`}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Visual Bidirectional Bar Chart */}
                    <div className="flex-1 flex items-center gap-2 max-w-md w-full">
                      <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-800 relative">
                        {/* Center Zero reference line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-700 z-10" />

                        {legDelta < 0 ? (
                          <div className="w-1/2 flex justify-end">
                            <div
                              className="h-full bg-rose-500 rounded-l-sm transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-1/2" />
                        )}

                        {legDelta >= 0 ? (
                          <div className="w-1/2 flex justify-start">
                            <div
                              className="h-full bg-emerald-500 rounded-r-sm transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-1/2" />
                        )}
                      </div>
                    </div>

                    {/* Right: Numeric Delta & Solo Button */}
                    <div className="flex items-center justify-end gap-3 min-w-[130px]">
                      <div className="text-right font-mono">
                        <div className={`text-sm font-bold ${legDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {legDelta >= 0 ? '+' : ''}{legDelta.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {absDelta > 0.01 && ((absDelta / (maxAbsDelta * activeLegs.length || 1)) * 100).toFixed(0)}% weight
                        </span>
                      </div>

                      <button
                        onClick={() => handleSoloLeg(leg.id)}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Isolate ONLY this leg's delta"
                      >
                        Solo
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Interactive Gamma (Γ) Isolation & Visualization */}
      {mode === 'gamma' && (
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Subheader and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider">
                  Isolated Net Gamma
                </span>
                <div className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                  {isolatedGamma >= 0 ? '+' : ''}{isolatedGamma.toFixed(4)}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                    ({isolatedGamma > 0.0005 ? 'Long Curvature (Accelerating)' : isolatedGamma < -0.0005 ? 'Short Curvature (Decelerating)' : 'Gamma Flat'})
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-mono">
                <div>Underlying Spot: <span className="text-slate-900 dark:text-white font-bold">{c}{environment.spotPrice}</span></div>
                <div>Delta shift / 10pt: <span className="text-indigo-700 dark:text-indigo-300 font-bold">{(isolatedGamma * 10).toFixed(3)}</span></div>
              </div>
            </div>

            {/* Sub-Filters and Reset */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                {(['ALL', 'CALLS', 'PUTS', 'LONG', 'SHORT'] as LegFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setLegFilter(f)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      legFilter === f ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {isolatedLegIds.length > 0 && (
                <button
                  onClick={handleResetIsolation}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors font-medium"
                  title="Reset to include all active legs"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Interactive Leg Gamma Rows */}
          <div className="flex flex-col gap-2.5">
            {displayedLegs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No active legs matching current filter criteria.
              </div>
            ) : (
              displayedLegs.map(leg => {
                const val = valuations.find(v => v.legId === leg.id);
                if (!val) return null;

                const isIncluded = isLegIsolatedActive(leg.id);
                const legGamma = val.greeks.gamma;
                const absGamma = Math.abs(legGamma);
                const barWidthPct = Math.min(100, Math.max(3, (absGamma / maxAbsGamma) * 100));

                return (
                  <div
                    key={leg.id}
                    className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isIncluded
                        ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 shadow-xs'
                        : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/40 opacity-40'
                    }`}
                  >
                    {/* Left: Leg Info & Checkbox */}
                    <div className="flex items-center gap-2.5 min-w-[200px]">
                      <button
                        onClick={() => handleToggleIsolation(leg.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        title={isIncluded ? 'Click to exclude this leg from Gamma' : 'Click to include this leg'}
                      >
                        {isIncluded ? (
                          <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square size={16} className="text-slate-400 dark:text-slate-600" />
                        )}
                      </button>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            leg.action === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {leg.action}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            {leg.strike} {leg.type}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({leg.lots}x {leg.lotSize})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Distance from Spot: {Math.abs(leg.strike - environment.spotPrice)} pts ({(((leg.strike - environment.spotPrice) / environment.spotPrice) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Middle: Visual Gamma Contribution Bar */}
                    <div className="flex-1 flex items-center gap-2 max-w-md w-full">
                      <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-800 relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-700 z-10" />

                        {legGamma < 0 ? (
                          <div className="w-1/2 flex justify-end">
                            <div
                              className="h-full bg-rose-500 rounded-l-sm transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-1/2" />
                        )}

                        {legGamma >= 0 ? (
                          <div className="w-1/2 flex justify-start">
                            <div
                              className="h-full bg-indigo-500 rounded-r-sm transition-all duration-300"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                        ) : (
                          <div className="w-1/2" />
                        )}
                      </div>
                    </div>

                    {/* Right: Numeric Gamma & Solo Button */}
                    <div className="flex items-center justify-end gap-3 min-w-[130px]">
                      <div className="text-right font-mono">
                        <div className={`text-sm font-bold ${legGamma >= 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-rose-600 dark:text-rose-400'}`}>
                          {legGamma >= 0 ? '+' : ''}{legGamma.toFixed(4)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {leg.action === 'BUY' ? 'Long Curvature' : 'Short Curvature'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSoloLeg(leg.id)}
                        className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Isolate ONLY this leg's gamma"
                      >
                        Solo
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
