import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Infinity as InfinityIcon, ShieldCheck, ShieldAlert } from 'lucide-react';
import { OptionLeg, MarketEnvironment, PayoffDataPoint } from '../types/options';

export interface PayoffRiskMetricsResult {
  maxProfit: string;
  isMaxProfitUnlimited: boolean;
  maxLoss: string;
  isMaxLossUnlimited: boolean;
  breakevens: string[];
  hasActiveTrades: boolean;
}

/**
 * 1. Logic function that calculates 'Max Profit', 'Max Loss', and 'Breakeven Points'
 * based on the current payoff data points and active legs.
 */
export function calculatePayoffRiskMetrics(
  points: PayoffDataPoint[],
  legs: OptionLeg[],
  currency: string = '₹'
): PayoffRiskMetricsResult {
  const activeLegs = legs.filter(l => l.enabled);

  if (activeLegs.length === 0 || points.length === 0) {
    return {
      maxProfit: `${currency}0`,
      isMaxProfitUnlimited: false,
      maxLoss: `${currency}0`,
      isMaxLossUnlimited: false,
      breakevens: ['None'],
      hasActiveTrades: false
    };
  }

  // 1. Analyze asymptotic slope at endpoints to detect Unlimited / Infinite profit or loss
  const firstPt = points[0];
  const secondPt = points[1] || points[0];
  const lastPt = points[points.length - 1];
  const prevLastPt = points[points.length - 2] || points[points.length - 1];

  const rightSlope = (lastPt.expiryPnL - prevLastPt.expiryPnL) / (lastPt.spot - prevLastPt.spot || 1);
  const leftSlope = (secondPt.expiryPnL - firstPt.expiryPnL) / (secondPt.spot - firstPt.spot || 1);

  // Check net delta/option balance
  let netCalls = 0;
  let netPuts = 0;
  activeLegs.forEach(l => {
    const dir = l.action === 'BUY' ? 1 : -1;
    if (l.type === 'CALL') netCalls += dir * l.lots;
    if (l.type === 'PUT') netPuts += dir * l.lots;
  });

  // 2. Determine if Max Profit is Unlimited / Infinite
  // Positive slope on right (e.g. Long Call) or negative slope on left (e.g. Long Put going to 0)
  const isMaxProfitUnlimited = netCalls > 0 || rightSlope > 0.1 || (netPuts > 0 && leftSlope < -0.1);

  // Determine if Max Loss is Unlimited / Infinite
  // Negative slope on right (e.g. Short Call) or positive slope on left (e.g. Short Put / Long Future)
  const isMaxLossUnlimited = netCalls < 0 || rightSlope < -0.1 || netPuts < 0;

  // Numerical max & min over the generated curve
  const peakPnL = Math.max(...points.map(p => p.expiryPnL));
  const troughPnL = Math.min(...points.map(p => p.expiryPnL));

  const maxProfit = isMaxProfitUnlimited
    ? 'Unlimited'
    : `${peakPnL >= 0 ? '+' : ''}${currency}${Math.round(peakPnL).toLocaleString('en-IN')}`;

  const maxLoss = isMaxLossUnlimited
    ? 'Unlimited'
    : `${troughPnL >= 0 ? '+' : ''}${currency}${Math.round(troughPnL).toLocaleString('en-IN')}`;

  // 3. Find Breakeven points (zero crossings)
  const breakevenList: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if ((p1.expiryPnL <= 0 && p2.expiryPnL >= 0) || (p1.expiryPnL >= 0 && p2.expiryPnL <= 0)) {
      if (Math.abs(p2.expiryPnL - p1.expiryPnL) > 0.001) {
        // Linear root interpolation
        const root = p1.spot + (-p1.expiryPnL / (p2.expiryPnL - p1.expiryPnL)) * (p2.spot - p1.spot);
        // Avoid duplicate roots within close tolerance
        if (!breakevenList.some(be => Math.abs(be - root) < 5)) {
          breakevenList.push(Math.round(root * 10) / 10);
        }
      }
    }
  }

  const breakevens = breakevenList.length > 0
    ? breakevenList.map(be => `${currency}${be.toLocaleString('en-IN')}`)
    : ['None'];

  return {
    maxProfit,
    isMaxProfitUnlimited,
    maxLoss,
    isMaxLossUnlimited,
    breakevens,
    hasActiveTrades: true
  };
}

interface PayoffRiskSummaryBarProps {
  points: PayoffDataPoint[];
  legs: OptionLeg[];
  environment: MarketEnvironment;
  className?: string;
}

export const PayoffRiskSummaryBar: React.FC<PayoffRiskSummaryBarProps> = ({
  points,
  legs,
  environment,
  className = ''
}) => {
  // 4. Automatically updates whenever points or legs change
  const metrics = useMemo(() => {
    return calculatePayoffRiskMetrics(points, legs, environment.currency);
  }, [points, legs, environment.currency]);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {/* BADGE 1: GREEN FOR MAX PROFIT */}
      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs transition-all hover:border-emerald-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp size={16} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Max Profit
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-black font-mono text-emerald-950">
                {metrics.maxProfit}
              </span>
              {metrics.isMaxProfitUnlimited && (
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                  Infinite ∞
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-emerald-700 font-medium hidden lg:inline">
          At Expiry
        </span>
      </div>

      {/* BADGE 2: RED FOR MAX LOSS */}
      <div className="bg-rose-50/90 border border-rose-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs transition-all hover:border-rose-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrendingDown size={16} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
              Max Loss
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-black font-mono text-rose-950">
                {metrics.maxLoss}
              </span>
              {metrics.isMaxLossUnlimited && (
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 border border-rose-300">
                  Infinite ∞
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-rose-700 font-medium hidden lg:inline">
          Downside Risk
        </span>
      </div>

      {/* BADGE 3: BLUE FOR BREAKEVEN */}
      <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs transition-all hover:border-blue-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Target size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Breakeven Point(s)
            </span>
            <div className="mt-0.5 truncate" title={metrics.breakevens.join(', ')}>
              <span className="text-base sm:text-lg font-black font-mono text-blue-950">
                {metrics.breakevens.join(' · ')}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-blue-700 font-medium hidden lg:inline shrink-0 ml-2">
          0 P&L Point
        </span>
      </div>
    </div>
  );
};
