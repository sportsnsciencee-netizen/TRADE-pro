import React from 'react';
import { MarketEnvironment, OptionLeg, PositionMetrics, LegValuation, WhatIfParameters } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';
import { BarChart3, HelpCircle, Info } from 'lucide-react';

interface GreeksMatrixViewProps {
  legs: OptionLeg[];
  environment: MarketEnvironment;
  whatIf: WhatIfParameters;
  valuations: LegValuation[];
  metrics: PositionMetrics;
}

export const GreeksMatrixView: React.FC<GreeksMatrixViewProps> = ({
  legs,
  environment,
  whatIf,
  valuations,
  metrics
}) => {
  const activeLegs = legs.filter(l => l.enabled);
  const c = environment.currency;

  // Generate Spot Sensitivity Matrix (-10% to +10%)
  const spotShifts = [-0.08, -0.04, -0.02, 0, 0.02, 0.04, 0.08];

  const sensitivityTable = spotShifts.map(pct => {
    const testSpot = environment.spotPrice * (1 + pct);
    let shiftedDelta = 0;
    let shiftedGamma = 0;
    let shiftedTheta = 0;
    let shiftedVega = 0;

    activeLegs.forEach(leg => {
      const multiplier = leg.lots * leg.lotSize;
      const direction = leg.action === 'BUY' ? 1 : -1;
      const effectiveMult = multiplier * direction;
      const t = getTimeToExpiryInYears(whatIf.targetDate, leg.expiry);
      const iv = (leg.ivOverride ?? environment.globalIV) / 100;
      const bsm = calculateBSM(testSpot, leg.strike, t, environment.interestRate / 100, iv, leg.type);

      shiftedDelta += bsm.delta * effectiveMult;
      shiftedGamma += bsm.gamma * effectiveMult;
      shiftedTheta += bsm.theta * effectiveMult;
      shiftedVega += bsm.vega * effectiveMult;
    });

    return {
      pct: (pct * 100).toFixed(0) + '%',
      spot: Math.round(testSpot),
      delta: shiftedDelta,
      gamma: shiftedGamma,
      theta: shiftedTheta,
      vega: shiftedVega
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Greeks Explanation & Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Full Quantitative Greeks Decomposition</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Analytical First & Second Order Sensitivities
          </span>
        </div>

        {/* Detailed Per-Leg Greeks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium font-sans">
                <th className="py-2 px-3">Leg</th>
                <th className="py-2 px-3">Position</th>
                <th className="py-2 px-3 text-right">Unit Delta</th>
                <th className="py-2 px-3 text-right">Net Delta (Δ)</th>
                <th className="py-2 px-3 text-right">Net Gamma (Γ)</th>
                <th className="py-2 px-3 text-right">Net Theta (Θ/day)</th>
                <th className="py-2 px-3 text-right">Net Vega (ν/1% IV)</th>
                <th className="py-2 px-3 text-right">Net Rho (ρ/1% r)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {activeLegs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 font-sans">
                    No active legs available to decompose.
                  </td>
                </tr>
              ) : (
                activeLegs.map(leg => {
                  const val = valuations.find(v => v.legId === leg.id);
                  if (!val) return null;
                  const unitDelta = val.greeks.delta / (leg.lots * leg.lotSize * (leg.action === 'BUY' ? 1 : -1) || 1);

                  return (
                    <tr key={leg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {leg.name || `Strike ${leg.strike}`}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          leg.action === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}>
                          {leg.action} {leg.lots}x {leg.strike} {leg.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                        {unitDelta.toFixed(3)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${val.greeks.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {val.greeks.delta >= 0 ? '+' : ''}{val.greeks.delta.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-300">
                        {val.greeks.gamma.toFixed(4)}
                      </td>
                      <td className={`py-2.5 px-3 text-right ${val.greeks.theta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {val.greeks.theta >= 0 ? '+' : ''}{c}{Math.round(val.greeks.theta)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-cyan-700 dark:text-cyan-300">
                        {val.greeks.vega >= 0 ? '+' : ''}{c}{Math.round(val.greeks.vega)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-700 dark:text-purple-300">
                        {val.greeks.rho >= 0 ? '+' : ''}{c}{Math.round(val.greeks.rho)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {activeLegs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold font-mono">
                  <td colSpan={3} className="py-3 px-3 text-slate-900 dark:text-white font-sans">
                    Portfolio Total Net Greeks
                  </td>
                  <td className={`py-3 px-3 text-right ${metrics.netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {metrics.netDelta >= 0 ? '+' : ''}{metrics.netDelta.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-300">
                    {metrics.netGamma.toFixed(4)}
                  </td>
                  <td className={`py-3 px-3 text-right ${metrics.netTheta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {metrics.netTheta >= 0 ? '+' : ''}{c}{Math.round(metrics.netTheta)}
                  </td>
                  <td className="py-3 px-3 text-right text-cyan-700 dark:text-cyan-300">
                    {metrics.netVega >= 0 ? '+' : ''}{c}{Math.round(metrics.netVega)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-700 dark:text-purple-300">
                    {metrics.netRho >= 0 ? '+' : ''}{c}{Math.round(metrics.netRho)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Spot Price Greek Sensitivity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Spot Sensitivity Stress Matrix</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            How portfolio Greeks dynamically morph as Spot moves
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                <th className="py-2 px-3">Spot Scenario</th>
                <th className="py-2 px-3">Hypothetical Spot</th>
                <th className="py-2 px-3 text-right">Dynamic Delta (Δ)</th>
                <th className="py-2 px-3 text-right">Dynamic Gamma (Γ)</th>
                <th className="py-2 px-3 text-right">Dynamic Theta (Θ/day)</th>
                <th className="py-2 px-3 text-right">Dynamic Vega (ν/1% IV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {sensitivityTable.map(row => {
                const isCurrent = row.pct === '0%';
                return (
                  <tr
                    key={row.pct}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                      isCurrent ? 'bg-cyan-50/70 dark:bg-cyan-950/40 font-semibold border-l-2 border-cyan-500 dark:border-cyan-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        isCurrent ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {row.pct} {isCurrent && '(Base)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                      {c}{row.spot.toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${row.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-300">
                      {row.gamma.toFixed(4)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${row.theta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {row.theta >= 0 ? '+' : ''}{c}{Math.round(row.theta)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-700 dark:text-cyan-300">
                      {row.vega >= 0 ? '+' : ''}{c}{Math.round(row.vega)}
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
