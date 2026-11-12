import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Sparkles, BookOpen, Clock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { MarketEnvironment, OptionLeg, OptionType } from '../types/options';
import { getStrikeStep, roundToStrike, getExpiryDate, getLegPremium } from '../data/strategyTemplates';

export type CalendarSpreadType = 'calendar' | 'double-calendar' | 'triple-calendar';

interface CalendarStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyType: CalendarSpreadType;
  environment: MarketEnvironment;
  onAutoBuild: (legs: OptionLeg[]) => void;
}

interface CalendarExplanation {
  title: string;
  howBuilt: string;
  whenToUse: string;
  fullQuote: string;
}

const EXPLANATIONS: Record<CalendarSpreadType, CalendarExplanation> = {
  'calendar': {
    title: 'Configure Calendar Spread',
    howBuilt: 'Built by selling a near-term ATM option and buying a far-term ATM option at the same strike.',
    whenToUse: 'It profits from time decay (Theta) differences and is used when you expect the market to stay range-bound in the near term but move later.',
    fullQuote: 'Built by selling a near-term ATM option and buying a far-term ATM option at the same strike. It profits from time decay (Theta) differences and is used when you expect the market to stay range-bound in the near term but move later.'
  },
  'double-calendar': {
    title: 'Configure Double Calendar Spread',
    howBuilt: 'Built by selling near-term ATM Call and Put, and buying far-term ATM Call and Put.',
    whenToUse: 'It is a market-neutral strategy that profits from time decay and increased volatility.',
    fullQuote: 'Built by selling near-term ATM Call and Put, and buying far-term ATM Call and Put. It is a market-neutral strategy that profits from time decay and increased volatility.'
  },
  'triple-calendar': {
    title: 'Configure Triple Calendar Spread',
    howBuilt: 'Typically involves selling near-term, buying mid-term, and selling far-term options at the same ATM strike.',
    whenToUse: 'Uses three different expiries to fine-tune time decay across short and medium-term volatility cycles.',
    fullQuote: 'Uses three different expiries to fine-tune time decay. Typically involves selling near-term, buying mid-term, and selling far-term options.'
  }
};

export const CalendarStrategyModal: React.FC<CalendarStrategyModalProps> = ({
  isOpen,
  onClose,
  strategyType,
  environment,
  onAutoBuild
}) => {
  const explanation = EXPLANATIONS[strategyType] || EXPLANATIONS['calendar'];

  // ATM Strike calculation based on spot price
  const step = useMemo(() => getStrikeStep(environment.spotPrice), [environment.spotPrice]);
  const defaultAtmStrike = useMemo(
    () => roundToStrike(environment.spotPrice, step),
    [environment.spotPrice, step]
  );
  const [selectedStrike, setSelectedStrike] = useState<number>(defaultAtmStrike);

  // Single Calendar option type toggle (Call or Put)
  const [singleOptionType, setSingleOptionType] = useState<OptionType>('CALL');

  // Multi-Expiry Date states
  const [nearExpiry, setNearExpiry] = useState<string>(() => getExpiryDate(environment.baseDate, 7));
  const [midExpiry, setMidExpiry] = useState<string>(() => getExpiryDate(environment.baseDate, 14));
  const [farExpiry, setFarExpiry] = useState<string>(() => getExpiryDate(environment.baseDate, 28));

  // Reset strike and dates when modal opens or spot/env changes
  useEffect(() => {
    setSelectedStrike(defaultAtmStrike);
    setNearExpiry(getExpiryDate(environment.baseDate, 7));
    setMidExpiry(getExpiryDate(environment.baseDate, 14));
    setFarExpiry(getExpiryDate(environment.baseDate, 28));
  }, [isOpen, defaultAtmStrike, environment.baseDate]);

  if (!isOpen) return null;

  const lotSize = environment.symbol.includes('NIFTY') ? 50 : 100;

  // Build the theoretical preview legs dynamically
  const previewLegs: OptionLeg[] = (() => {
    const strike = selectedStrike || defaultAtmStrike;

    if (strategyType === 'calendar') {
      const pNear = getLegPremium(
        environment.spotPrice,
        strike,
        singleOptionType,
        environment.baseDate,
        nearExpiry,
        environment.globalIV,
        environment.interestRate
      );
      const pFar = getLegPremium(
        environment.spotPrice,
        strike,
        singleOptionType,
        environment.baseDate,
        farExpiry,
        environment.globalIV,
        environment.interestRate
      );

      const typeLabel = singleOptionType === 'CALL' ? 'CE' : 'PE';
      return [
        {
          id: `preview-leg-1`,
          name: `Sell Near ATM ${typeLabel}`,
          enabled: true,
          action: 'SELL',
          type: singleOptionType,
          strike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNear
        },
        {
          id: `preview-leg-2`,
          name: `Buy Far ATM ${typeLabel}`,
          enabled: true,
          action: 'BUY',
          type: singleOptionType,
          strike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFar
        }
      ];
    }

    if (strategyType === 'double-calendar') {
      const pNearCall = getLegPremium(environment.spotPrice, strike, 'CALL', environment.baseDate, nearExpiry, environment.globalIV, environment.interestRate);
      const pNearPut = getLegPremium(environment.spotPrice, strike, 'PUT', environment.baseDate, nearExpiry, environment.globalIV, environment.interestRate);
      const pFarCall = getLegPremium(environment.spotPrice, strike, 'CALL', environment.baseDate, farExpiry, environment.globalIV, environment.interestRate);
      const pFarPut = getLegPremium(environment.spotPrice, strike, 'PUT', environment.baseDate, farExpiry, environment.globalIV, environment.interestRate);

      return [
        {
          id: `preview-leg-1`,
          name: `Sell Near ATM CE`,
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNearCall
        },
        {
          id: `preview-leg-2`,
          name: `Sell Near ATM PE`,
          enabled: true,
          action: 'SELL',
          type: 'PUT',
          strike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNearPut
        },
        {
          id: `preview-leg-3`,
          name: `Buy Far ATM CE`,
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFarCall
        },
        {
          id: `preview-leg-4`,
          name: `Buy Far ATM PE`,
          enabled: true,
          action: 'BUY',
          type: 'PUT',
          strike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFarPut
        }
      ];
    }

    // Triple Calendar Spread: Sell Near Call, Buy Mid Call, Sell Far Call
    const pNear = getLegPremium(environment.spotPrice, strike, 'CALL', environment.baseDate, nearExpiry, environment.globalIV, environment.interestRate);
    const pMid = getLegPremium(environment.spotPrice, strike, 'CALL', environment.baseDate, midExpiry, environment.globalIV, environment.interestRate);
    const pFar = getLegPremium(environment.spotPrice, strike, 'CALL', environment.baseDate, farExpiry, environment.globalIV, environment.interestRate);

    return [
      {
        id: `preview-leg-1`,
        name: `Sell Near ATM CE`,
        enabled: true,
        action: 'SELL',
        type: 'CALL',
        strike,
        expiry: nearExpiry,
        lotSize,
        lots: 1,
        entryPrice: pNear
      },
      {
        id: `preview-leg-2`,
        name: `Buy Mid ATM CE`,
        enabled: true,
        action: 'BUY',
        type: 'CALL',
        strike,
        expiry: midExpiry,
        lotSize,
        lots: 1,
        entryPrice: pMid
      },
      {
        id: `preview-leg-3`,
        name: `Sell Far ATM CE`,
        enabled: true,
        action: 'SELL',
        type: 'CALL',
        strike,
        expiry: farExpiry,
        lotSize,
        lots: 1,
        entryPrice: pFar
      }
    ];
  })();

  const handleAutoBuildClick = () => {
    // Generate fresh unique IDs for active execution
    const finalizedLegs = previewLegs.map((leg, i) => ({
      ...leg,
      id: `leg-cal-${Date.now()}-${i + 1}`
    }));

    onAutoBuild(finalizedLegs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {explanation.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {environment.symbol} Spot: {environment.currency}{environment.spotPrice.toLocaleString()} • ATM Strike: {selectedStrike}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs text-slate-700">

          {/* 1. Underlying & Strike Selector Row */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Underlying Spot Asset</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {environment.symbol} @ {environment.currency}{environment.spotPrice.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="atm-strike-input" className="text-[11px] text-slate-500 font-medium">ATM Strike:</label>
              <input
                id="atm-strike-input"
                type="number"
                step={step}
                value={selectedStrike}
                onChange={(e) => setSelectedStrike(parseFloat(e.target.value) || defaultAtmStrike)}
                className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {strategyType === 'calendar' && (
              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSingleOptionType('CALL')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    singleOptionType === 'CALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Call (CE)
                </button>
                <button
                  type="button"
                  onClick={() => setSingleOptionType('PUT')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    singleOptionType === 'PUT'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Put (PE)
                </button>
              </div>
            )}
          </div>

          {/* 2. EXPIRY SELECTION SECTION */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                <span>Expiry Date Selection</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {strategyType === 'triple-calendar' ? '3 cycle dates' : '2 cycle dates'}
              </span>
            </div>

            <div className={`grid gap-3 ${strategyType === 'triple-calendar' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {/* Near Expiry */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-800">
                    Near Expiry (Sell)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded font-semibold">
                    Short Leg
                  </span>
                </div>
                <input
                  type="date"
                  value={nearExpiry}
                  onChange={(e) => setNearExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Theta decay will accelerate here</span>
              </div>

              {/* Mid Expiry (Only for Triple Calendar) */}
              {strategyType === 'triple-calendar' && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-800">
                      Mid Expiry (Buy)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded font-semibold">
                      Long Leg
                    </span>
                  </div>
                  <input
                    type="date"
                    value={midExpiry}
                    onChange={(e) => setMidExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Middle anchor position</span>
                </div>
              )}

              {/* Far Expiry */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-800">
                    Far Expiry {strategyType === 'triple-calendar' ? '(Sell)' : '(Buy)'}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                    strategyType === 'triple-calendar'
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {strategyType === 'triple-calendar' ? 'Short Leg' : 'Long Leg'}
                  </span>
                </div>
                <input
                  type="date"
                  value={farExpiry}
                  onChange={(e) => setFarExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Longer horizon retention</span>
              </div>
            </div>
          </div>

          {/* 3. GENERATED LEGS PREVIEW TABLE */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Auto-Constructed Strategy Legs</span>
            </span>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-sans text-[11px] border-b border-slate-200">
                    <th className="py-1.5 px-3">Action</th>
                    <th className="py-1.5 px-3">Type</th>
                    <th className="py-1.5 px-3">Strike</th>
                    <th className="py-1.5 px-3">Expiry</th>
                    <th className="py-1.5 px-3 text-right">Theo. Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewLegs.map((leg) => (
                    <tr key={leg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-sans font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          leg.action === 'BUY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {leg.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {leg.type === 'CALL' ? 'CE' : 'PE'}
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-bold">
                        {leg.strike}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {leg.expiry}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900 font-semibold">
                        {environment.currency}{leg.entryPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. EDUCATIONAL CONTENT SECTION (EXACT TEXT AS SPECIFIED) */}
          <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-xl flex flex-col gap-2.5 text-xs text-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <BookOpen size={14} className="text-blue-600" />
              <span>Strategy Guide & Educational Breakdown</span>
            </div>

            <div className="space-y-2 text-slate-700 leading-relaxed font-sans">
              <div>
                <span className="font-bold text-slate-900 text-xs block">How this strategy is built:</span>
                <p className="text-[12px] text-slate-700 mt-0.5">{explanation.howBuilt}</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 text-xs block">When to use it:</span>
                <p className="text-[12px] text-slate-700 mt-0.5">{explanation.whenToUse}</p>
              </div>

              {/* Exact full text badge */}
              <div className="pt-2 border-t border-blue-200/60 mt-2">
                <p className="text-[11px] text-blue-950 font-medium italic bg-white/70 p-2 rounded-lg border border-blue-100">
                  "{explanation.fullQuote}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAutoBuildClick}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Auto-Build Strategy</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
