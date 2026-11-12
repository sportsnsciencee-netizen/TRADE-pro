import React, { useState } from 'react';
import { MarketEnvironment, OptionLeg, WhatIfParameters, PositionMetrics, LegValuation } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';
import { ArrowUpRight, ArrowDownRight, Calendar, Sliders, TrendingUp } from 'lucide-react';

interface PnLViewProps {
  legs: OptionLeg[];
  environment: MarketEnvironment;
  whatIf: WhatIfParameters;
  valuations: LegValuation[];
  metrics: PositionMetrics;
}

export const PnLView: React.FC<PnLViewProps> = ({
  legs,
  environment,
  whatIf,
  valuations,
  metrics
}) => {
  const activeLegs = legs.filter(l => l.enabled);
  const c = environment.currency;

  // Sensitivity spot shifts: -8%, -6%, -4%, -2%, 0%, +2%, +4%, +6%, +8%
  const spotShifts = [-0.08, -0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08];

  const pnlTable = spotShifts.map(pct => {
    const testSpot = environment.spotPrice * (1 + pct);
    let todayPnL = 0;
    let targetPnL = 0;
    let expiryPnL = 0;

    activeLegs.forEach(leg => {
      const multiplier = leg.lots * leg.lotSize;
      const direction = leg.action === 'BUY' ? 1 : -1;
      const iv = (leg.ivOverride ?? environment.globalIV) / 100;
      const r = environment.interestRate / 100;

      // 1. T+0 (Today)
      const t0 = getTimeToExpiryInYears(environment.baseDate, leg.expiry);
      const bsm0 = calculateBSM(testSpot, leg.strike, t0, r, iv, leg.type);
      todayPnL += (bsm0.price - leg.entryPrice) * multiplier * direction;

      // 2. Target Date
      const tTarget = getTimeToExpiryInYears(whatIf.targetDate, leg.expiry);
      const targetIV = Math.max(0.01, iv + whatIf.targetIVShift / 100);
      const bsmTarget = calculateBSM(testSpot, leg.strike, tTarget, r, targetIV, leg.type);
      targetPnL += (bsmTarget.price - leg.entryPrice) * multiplier * direction;

      // 3. Expiry
      let payoff = 0;
      if (leg.type === 'CALL') payoff = Math.max(0, testSpot - leg.strike);
      else if (leg.type === 'PUT') payoff = Math.max(0, leg.strike - testSpot);
      else payoff = testSpot - leg.strike;
      expiryPnL += (payoff - leg.entryPrice) * multiplier * direction;
    });

    return {
      pct: (pct * 100).toFixed(0) + '%',
      spot: Math.round(testSpot),
      todayPnL: Math.round(todayPnL),
      targetPnL: Math.round(targetPnL),
      expiryPnL: Math.round(expiryPnL)
    };
  });

  const fmtCurrency = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${c}${Math.abs(val).toLocaleString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* P&L Sensitivity Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <span>Multi-Scenario P&L Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">
              Theoretical profit/loss breakdown across spot movements and time horizons.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
            <span>Target Date: {whatIf.targetDate}</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Spot Scenario</th>
                <th className="py-2.5 px-3">Hypothetical Spot</th>
                <th className="py-2.5 px-3 text-right">T+0 Today P&L</th>
                <th className="py-2.5 px-3 text-right">Target Date P&L</th>
                <th className="py-2.5 px-3 text-right">At Expiry P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {pnlTable.map(row => {
                const isCurrent = row.pct === '0%';
                return (
                  <tr
                    key={row.pct}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrent ? 'bg-blue-50/60 font-semibold border-l-3 border-blue-600' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        isCurrent ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600'
                      }`}>
                        {row.pct} {isCurrent && '(Current Spot)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {c}{row.spot.toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${
                      row.todayPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {fmtCurrency(row.todayPnL)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      row.targetPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {fmtCurrency(row.targetPnL)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${
                      row.expiryPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {fmtCurrency(row.expiryPnL)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Leg P&L Contributions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Individual Leg Valuation & Theta Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-2 px-3">Leg</th>
                <th className="py-2 px-3">Side</th>
                <th className="py-2 px-3 text-right">Entry Premium</th>
                <th className="py-2 px-3 text-right">Theo. Value</th>
                <th className="py-2 px-3 text-right">Target P&L</th>
                <th className="py-2 px-3 text-right">Theta Decay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {activeLegs.map(leg => {
                const val = valuations.find(v => v.legId === leg.id);
                if (!val) return null;

                return (
                  <tr key={leg.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                      {leg.name || `${leg.strike} ${leg.type}`}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        leg.action === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {leg.action} {leg.lots}x {leg.strike} {leg.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {c}{leg.entryPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      {c}{val.targetValue.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      val.targetPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {fmtCurrency(Math.round(val.targetPnL))}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${
                      val.thetaDecayPnL >= 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {fmtCurrency(Math.round(val.thetaDecayPnL))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
