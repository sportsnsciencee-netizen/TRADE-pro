import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertTriangle,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { OptionLeg, MarketEnvironment, WhatIfParameters } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';

interface ScenarioAnalysisPanelProps {
  environment: MarketEnvironment;
  legs: OptionLeg[];
  whatIf?: WhatIfParameters;
  onApplyToWhatIf?: (targetSpot: number, targetIVShift: number) => void;
  className?: string;
}

export interface ScenarioGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface ScenarioResult {
  scenarioSpot: number;
  scenarioIV: number;
  estimatedPnL: number;
  greeks: ScenarioGreeks;
  summaryText: string;
}

/**
 * 2. Recalculate P&L and Greeks using Black-Scholes-Merton model based on slider values
 */
export function calculateScenarioStressTest(
  legs: OptionLeg[],
  environment: MarketEnvironment,
  spotChangePct: number,
  ivChangePct: number,
  valuationDate?: string
): ScenarioResult {
  const activeLegs = legs.filter(l => l.enabled);
  const baseSpot = environment.spotPrice;
  const baseIV = environment.globalIV;

  // New scenario spot & IV
  const scenarioSpot = Math.max(1, baseSpot * (1 + spotChangePct / 100));
  const scenarioIV = Math.max(1, baseIV + ivChangePct);

  const r = environment.interestRate / 100;
  const sigma = scenarioIV / 100;
  const targetDate = valuationDate || environment.baseDate;

  let estimatedPnL = 0;
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;

  for (const leg of activeLegs) {
    const direction = leg.action === 'BUY' ? 1 : -1;
    const multiplier = leg.lots * leg.lotSize * direction;
    const t = getTimeToExpiryInYears(targetDate, leg.expiry);

    // Individual leg IV override or scenario IV
    const legSigma = leg.ivOverride !== undefined && leg.ivOverride !== null
      ? Math.max(0.01, (leg.ivOverride + ivChangePct) / 100)
      : sigma;

    const bsm = calculateBSM(scenarioSpot, leg.strike, t, r, legSigma, leg.type);

    // Scenario P&L = (Theoretical Price - Entry Price) * effective quantity
    const legPnL = (bsm.price - leg.entryPrice) * multiplier;

    estimatedPnL += legPnL;
    delta += bsm.delta * multiplier;
    gamma += bsm.gamma * multiplier;
    theta += bsm.theta * multiplier;
    vega += bsm.vega * multiplier;
  }

  // 3. Construct descriptive summary text matching user format:
  // e.g. "If Nifty drops 5% and IV rises 10%, Estimated P&L: -₹2,500"
  const sym = environment.symbol.charAt(0).toUpperCase() + environment.symbol.slice(1).toLowerCase();

  let spotDesc = `${sym} stays unchanged (0%)`;
  if (spotChangePct < 0) {
    spotDesc = `${sym} drops ${Math.abs(spotChangePct)}%`;
  } else if (spotChangePct > 0) {
    spotDesc = `${sym} rises ${spotChangePct}%`;
  }

  let ivDesc = 'IV is unchanged (0%)';
  if (ivChangePct < 0) {
    ivDesc = `IV drops ${Math.abs(ivChangePct)}%`;
  } else if (ivChangePct > 0) {
    ivDesc = `IV rises ${ivChangePct}%`;
  }

  const roundedPnL = Math.round(estimatedPnL);
  const pnlSign = roundedPnL > 0 ? '+' : roundedPnL < 0 ? '-' : '';
  const pnlFormatted = `${pnlSign}${environment.currency}${Math.abs(roundedPnL).toLocaleString('en-IN')}`;

  const summaryText = `If ${spotDesc} and ${ivDesc}, Estimated P&L: ${pnlFormatted}`;

  return {
    scenarioSpot,
    scenarioIV,
    estimatedPnL: roundedPnL,
    greeks: {
      delta: Math.round(delta * 100) / 100,
      gamma: Math.round(gamma * 1000) / 1000,
      theta: Math.round(theta),
      vega: Math.round(vega)
    },
    summaryText
  };
}

export const ScenarioAnalysisPanel: React.FC<ScenarioAnalysisPanelProps> = ({
  environment,
  legs,
  whatIf,
  onApplyToWhatIf,
  className = ''
}) => {
  // 1. Two range sliders: Spot Price Change (%) & IV Change (%), -10% to +10%, default 0%
  const [spotChangePct, setSpotChangePct] = useState<number>(0);
  const [ivChangePct, setIvChangePct] = useState<number>(0);

  // Recalculate stress scenario
  const scenario = useMemo(() => {
    return calculateScenarioStressTest(
      legs,
      environment,
      spotChangePct,
      ivChangePct,
      whatIf?.targetDate
    );
  }, [legs, environment, spotChangePct, ivChangePct, whatIf?.targetDate]);

  const activeLegsCount = legs.filter(l => l.enabled).length;

  const handleReset = () => {
    setSpotChangePct(0);
    setIvChangePct(0);
  };

  const handlePreset = (spotShift: number, ivShift: number) => {
    setSpotChangePct(spotShift);
    setIvChangePct(ivShift);
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Scenario Analysis (Stress Testing)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                Range: ±10%
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Stress-test the position by shifting underlying spot price and implied volatility.
            </p>
          </div>
        </div>

        {/* Quick Presets & Reset */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handlePreset(-5, 10)}
            className="px-2 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
            title="Simulate -5% Spot drop and +10% IV spike"
          >
            -5% Spot, +10% IV
          </button>
          <button
            type="button"
            onClick={() => handlePreset(5, -5)}
            className="px-2 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
            title="Simulate +5% Spot rally and -5% IV crush"
          >
            +5% Spot, -5% IV
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset sliders to 0%"
          >
            <RotateCcw size={12} />
            <span>Reset (0%)</span>
          </button>
        </div>
      </div>

      {/* 3. PROMINENT SCENARIO SUMMARY BANNER */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          activeLegsCount === 0
            ? 'bg-slate-50 border-slate-200 text-slate-600'
            : scenario.estimatedPnL > 0
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            : scenario.estimatedPnL < 0
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : 'bg-blue-50/80 border-blue-200 text-blue-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {activeLegsCount === 0 ? (
            <Info size={18} className="text-slate-400 shrink-0" />
          ) : scenario.estimatedPnL > 0 ? (
            <TrendingUp size={18} className="text-emerald-600 shrink-0" />
          ) : scenario.estimatedPnL < 0 ? (
            <TrendingDown size={18} className="text-rose-600 shrink-0" />
          ) : (
            <Zap size={18} className="text-blue-600 shrink-0" />
          )}

          <div>
            {/* Exactly formatted small text as requested */}
            <p className="text-xs sm:text-sm font-extrabold tracking-tight font-sans">
              {activeLegsCount > 0 ? scenario.summaryText : 'No active trades added to calculate stress test P&L.'}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5 font-mono">
              Hypothetical Spot: ₹{scenario.scenarioSpot.toLocaleString(undefined, { maximumFractionDigits: 1 })} • Scenario IV: {scenario.scenarioIV.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Sync with What-If Engine button if callback is provided */}
        {onApplyToWhatIf && activeLegsCount > 0 && (
          <button
            type="button"
            onClick={() => onApplyToWhatIf(scenario.scenarioSpot, ivChangePct)}
            className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shrink-0"
          >
            <span>Apply to Payoff Curve</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* 1. TWO RANGE SLIDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SLIDER 1: SPOT PRICE CHANGE (%) */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="spot-change-slider" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
              <span>Spot Price Change (%)</span>
            </label>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                spotChangePct > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : spotChangePct < 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {spotChangePct > 0 ? `+${spotChangePct.toFixed(1)}%` : `${spotChangePct.toFixed(1)}%`}
            </span>
          </div>

          {/* Range Slider (-10% to +10%, default 0%) */}
          <input
            id="spot-change-slider"
            type="range"
            min="-10"
            max="10"
            step="0.5"
            value={spotChangePct}
            onChange={(e) => setSpotChangePct(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>-10% (Drop)</span>
            <span className="font-semibold text-slate-700">0% (Current: ₹{environment.spotPrice.toLocaleString()})</span>
            <span>+10% (Rise)</span>
          </div>
        </div>

        {/* SLIDER 2: IMPLIED VOLATILITY (IV) CHANGE (%) */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="iv-change-slider" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
              <span>Implied Volatility (IV) Change (%)</span>
            </label>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                ivChangePct > 0
                  ? 'bg-amber-100 text-amber-800'
                  : ivChangePct < 0
                  ? 'bg-cyan-100 text-cyan-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {ivChangePct > 0 ? `+${ivChangePct.toFixed(1)}%` : `${ivChangePct.toFixed(1)}%`}
            </span>
          </div>

          {/* Range Slider (-10% to +10%, default 0%) */}
          <input
            id="iv-change-slider"
            type="range"
            min="-10"
            max="10"
            step="0.5"
            value={ivChangePct}
            onChange={(e) => setIvChangePct(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>-10% (Crush)</span>
            <span className="font-semibold text-slate-700">0% (Base IV: {environment.globalIV}%)</span>
            <span>+10% (Spike)</span>
          </div>
        </div>
      </div>

      {/* 2. RECALCULATED GREEKS UNDER SCENARIO */}
      {activeLegsCount > 0 && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Activity size={13} className="text-indigo-600" />
            <span>Stress-Tested Portfolio Greeks:</span>
          </span>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Delta (Δ)</span>
              <span className={`font-bold ${scenario.greeks.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {scenario.greeks.delta >= 0 ? '+' : ''}{scenario.greeks.delta}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Gamma (Γ)</span>
              <span className="font-bold text-slate-800">
                {scenario.greeks.gamma}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Daily Theta (Θ)</span>
              <span className={`font-bold ${scenario.greeks.theta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {scenario.greeks.theta >= 0 ? '+' : ''}{environment.currency}{scenario.greeks.theta}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-sans">Vega (V)</span>
              <span className="font-bold text-amber-700">
                {environment.currency}{scenario.greeks.vega}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
