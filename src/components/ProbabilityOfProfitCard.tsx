import React, { useMemo } from 'react';
import { Percent, Target, TrendingUp, Info, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import { MarketEnvironment, OptionLeg } from '../types/options';
import { getTimeToExpiryInYears } from '../utils/blackScholes';

interface ProbabilityOfProfitCardProps {
  pop: number; // e.g. 65.4
  breakevens: number[];
  environment: MarketEnvironment;
  legs: OptionLeg[];
  className?: string;
  variant?: 'detailed' | 'compact';
}

export function calculatePopDetails(
  pop: number,
  breakevens: number[],
  environment: MarketEnvironment,
  legs: OptionLeg[]
) {
  const activeLegs = legs.filter(l => l.enabled);
  if (activeLegs.length === 0) {
    return {
      pop: 0,
      displayText: '0% Chance of Profit',
      verdict: 'No Active Trades',
      verdictColor: 'text-slate-500 bg-slate-100 border-slate-200',
      strokeColor: '#94a3b8',
      stdDevPoints: 0,
      expectedLower: environment.spotPrice,
      expectedUpper: environment.spotPrice,
      daysToExpiry: 0,
      hasActiveTrades: false
    };
  }

  // Find shortest expiry among active legs to calculate 1-standard deviation range
  const minExpiry = activeLegs.reduce((earliest, leg) => {
    return leg.expiry < earliest ? leg.expiry : earliest;
  }, activeLegs[0].expiry);

  const T = Math.max(1 / 365, getTimeToExpiryInYears(environment.baseDate, minExpiry));
  const daysToExpiry = Math.max(1, Math.round(T * 365));

  // 1-Standard Deviation move: Spot * IV * sqrt(T)
  const ivDecimal = environment.globalIV / 100;
  const stdDevMove = environment.spotPrice * ivDecimal * Math.sqrt(T);
  const stdDevPoints = Math.round(stdDevMove);
  const expectedLower = Math.round(environment.spotPrice - stdDevMove);
  const expectedUpper = Math.round(environment.spotPrice + stdDevMove);

  const roundedPop = Math.min(99, Math.max(1, Math.round(pop)));
  const displayText = `${roundedPop}% Chance of Profit`;

  // Verdict rating
  let verdict = 'Balanced Probability';
  let verdictColor = 'text-blue-700 bg-blue-50 border-blue-200';
  let strokeColor = '#2563eb'; // blue-600

  if (roundedPop >= 65) {
    verdict = 'High Probability';
    verdictColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
    strokeColor = '#16a34a'; // emerald-600
  } else if (roundedPop < 45) {
    verdict = 'Low Probability / Speculative';
    verdictColor = 'text-amber-800 bg-amber-50 border-amber-200';
    strokeColor = '#d97706'; // amber-600
  }

  return {
    pop: roundedPop,
    displayText,
    verdict,
    verdictColor,
    strokeColor,
    stdDevPoints,
    expectedLower,
    expectedUpper,
    daysToExpiry,
    hasActiveTrades: true
  };
}

export const ProbabilityOfProfitCard: React.FC<ProbabilityOfProfitCardProps> = ({
  pop,
  breakevens,
  environment,
  legs,
  className = '',
  variant = 'detailed'
}) => {
  const details = useMemo(() => {
    return calculatePopDetails(pop, breakevens, environment, legs);
  }, [pop, breakevens, environment, legs]);

  // SVG Circular progress dimensions
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (details.pop / 100) * circumference;

  if (variant === 'compact') {
    return (
      <div className={`bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs ${className}`}>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={details.strokeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 - (details.pop / 100) * (2 * Math.PI * 40)}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute font-mono font-extrabold text-xs text-slate-900">
              {details.pop}%
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Probability of Profit</span>
            <span className="text-xs font-bold text-slate-900">{details.displayText}</span>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${details.verdictColor}`}>
          {details.verdict}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${className}`}>
      {/* Background glow */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Circular Gauge & Primary Percentage */}
        <div className="flex items-center gap-4">
          {/* Circular Progress Gauge */}
          <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
            <svg
              className="w-22 h-22 sm:w-24 sm:h-24 -rotate-90 drop-shadow-2xs"
              viewBox={`0 0 ${size} ${size}`}
            >
              {/* Background Track Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
              {/* Foreground Animated Value Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={details.strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 leading-none">
                {details.pop}%
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">
                POP
              </span>
            </div>
          </div>

          {/* Heading and Main Metric Text */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Probability of Profit (POP)
              </span>

              {/* Visually Appealing Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${details.verdictColor}`}>
                {details.verdict}
              </span>
            </div>

            {/* 2. Main formatted text: e.g. "65% Chance of Profit" */}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-sans text-slate-900 tracking-tight">
                {details.displayText}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Approximate probability of expiring with a net positive return.
            </p>
          </div>
        </div>

        {/* Right Side: Breakevens & 1-Standard Deviation stats */}
        {details.hasActiveTrades ? (
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-slate-600 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-100">
            {/* 1σ Expected Range */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white/90 px-2.5 py-1 rounded-md border border-emerald-100 shadow-2xs">
              <span className="text-emerald-700 font-bold">1σ Range ({details.daysToExpiry}D):</span>
              <span className="text-slate-900 font-semibold">
                ₹{details.expectedLower.toLocaleString()} – ₹{details.expectedUpper.toLocaleString()}
              </span>
              <span className="text-slate-400 font-normal">
                (±{details.stdDevPoints} pts)
              </span>
            </div>

            {/* Breakeven Corridor */}
            {breakevens.length > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white/90 px-2.5 py-1 rounded-md border border-emerald-100 shadow-2xs">
                <span className="text-blue-700 font-bold">Breakeven(s):</span>
                <span className="text-slate-900 font-semibold">
                  {breakevens.map(b => `₹${Math.round(b).toLocaleString()}`).join(' · ')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            Add trades to calculate POP
          </div>
        )}
      </div>

      {/* Explanatory Footnote */}
      <div className="mt-3 pt-2.5 border-t border-emerald-100/90 flex items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1.5 text-slate-600">
          <Info size={13} className="text-emerald-600 shrink-0" />
          <span>
            Computed via log-normal distribution integration over the {details.hasActiveTrades ? `${details.daysToExpiry}-day` : ''} 1σ standard deviation and strategy breakeven points.
          </span>
        </span>
      </div>
    </div>
  );
};
