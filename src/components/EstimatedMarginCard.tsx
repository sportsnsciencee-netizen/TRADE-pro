import React, { useMemo } from 'react';
import { Wallet, Info, ArrowUpRight, ShieldCheck, Layers, Banknote } from 'lucide-react';
import { OptionLeg, MarketEnvironment } from '../types/options';
import { calculateEstimatedMargin, formatMarginCurrency } from '../utils/marginCalculator';

interface EstimatedMarginCardProps {
  legs: OptionLeg[];
  environment: MarketEnvironment;
  className?: string;
  variant?: 'banner' | 'compact' | 'detailed';
}

export const EstimatedMarginCard: React.FC<EstimatedMarginCardProps> = ({
  legs,
  environment,
  className = '',
  variant = 'detailed'
}) => {
  const marginData = useMemo(() => calculateEstimatedMargin(legs), [legs]);
  const formattedTotal = formatMarginCurrency(marginData.totalMargin, environment.currency);

  const activeLegsCount = legs.filter(l => l.enabled).length;

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between shadow-xs ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <Wallet size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
              Estimated Margin Required
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
              {formattedTotal}
            </span>
          </div>
        </div>
        {marginData.isEntirelyBuy && activeLegsCount > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            Premium Paid Only
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white border-2 border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${className}`}>
      {/* Background subtle decoration */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Title & Value */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Wallet size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Estimated Margin Required
              </span>

              {/* Status Pill */}
              {activeLegsCount === 0 ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  No Active Positions
                </span>
              ) : marginData.isEntirelyBuy ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Total Premium Paid (100% Cash)
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Short Margin + Long Premiums
                </span>
              )}
            </div>

            {/* Prominent Formatted Currency Value */}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                {formattedTotal}
              </span>
              <span className="text-xs text-slate-500 font-sans font-medium">
                approx. capital blocked
              </span>
            </div>
          </div>
        </div>

        {/* Right: Breakdown Chips */}
        {activeLegsCount > 0 ? (
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-slate-600 border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-100">
            {marginData.hasShortLegs && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white/80 px-2 py-1 rounded-md border border-blue-100">
                <span className="text-rose-600 font-bold">Short Legs:</span>
                <span>
                  {formatMarginCurrency(marginData.shortLegsMargin, environment.currency)}
                </span>
                <span className="text-slate-400">
                  ({marginData.shortLotsCount} lot{marginData.shortLotsCount > 1 ? 's' : ''} @ ₹1,00,000)
                </span>
              </div>
            )}

            {marginData.longLegsCount > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white/80 px-2 py-1 rounded-md border border-blue-100">
                <span className="text-emerald-600 font-bold">Long Premium:</span>
                <span>
                  {formatMarginCurrency(marginData.longLegsPremium, environment.currency)}
                </span>
                <span className="text-slate-400">
                  ({marginData.longLegsCount} leg{marginData.longLegsCount > 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            Add legs to calculate margin
          </div>
        )}
      </div>

      {/* Explanatory Footnote as specified in rule 2 & 4 */}
      <div className="mt-3 pt-2.5 border-t border-blue-100/80 flex items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1 text-slate-600">
          <Info size={12} className="text-blue-500 shrink-0" />
          <span>
            {marginData.isEntirelyBuy
              ? 'Strategy is entirely Buy: Margin required is exactly the total option premium paid.'
              : 'Calculation formula: ₹1,00,000 per short (Sell) option leg plus total premium paid for long (Buy) legs.'}
          </span>
        </span>
      </div>
    </div>
  );
};
