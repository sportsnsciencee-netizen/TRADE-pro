import React from 'react';
import { MarketEnvironment, OptionLeg, OptionAction, OptionType, LegValuation, WhatIfParameters } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';
import { Plus, Trash2, Copy, Sparkles, Check, CheckSquare, Square, Calculator, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface LegsTableProps {
  legs: OptionLeg[];
  onChangeLegs: (legs: OptionLeg[]) => void;
  environment: MarketEnvironment;
  whatIf: WhatIfParameters;
  valuations: LegValuation[];
  onLockSingleLeg: (legId: string) => void;
}

export const LegsTable: React.FC<LegsTableProps> = ({
  legs,
  onChangeLegs,
  environment,
  whatIf,
  valuations,
  onLockSingleLeg
}) => {
  // Add a new default leg
  const handleAddLeg = () => {
    const step = environment.spotPrice > 1000 ? 50 : 5;
    const strike = Math.round(environment.spotPrice / step) * step;

    // Default expiry 14 days ahead
    const d = new Date(environment.baseDate);
    d.setDate(d.getDate() + 14);
    const expiry = d.toISOString().slice(0, 10);

    const t = getTimeToExpiryInYears(environment.baseDate, expiry);
    const bsm = calculateBSM(environment.spotPrice, strike, t, environment.interestRate / 100, environment.globalIV / 100, 'CALL');
    const entryPrice = Math.max(0.5, Math.round(bsm.price * 20) / 20);

    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Leg ${legs.length + 1}`,
      enabled: true,
      action: 'BUY',
      type: 'CALL',
      strike,
      expiry,
      lotSize: environment.symbol.includes('NIFTY') ? 50 : 100,
      lots: 1,
      entryPrice,
      ivOverride: null
    };

    onChangeLegs([...legs, newLeg]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    onChangeLegs(legs.map(leg => (leg.id === id ? { ...leg, ...updates } : leg)));
  };

  const handleDeleteLeg = (id: string) => {
    onChangeLegs(legs.filter(leg => leg.id !== id));
  };

  const handleDuplicateLeg = (leg: OptionLeg) => {
    const duplicated: OptionLeg = {
      ...leg,
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${leg.name || 'Leg'} (Copy)`
    };
    onChangeLegs([...legs, duplicated]);
  };

  // Re-calculate theoretical BSM entry premium for a leg
  const handleAutoPrice = (leg: OptionLeg) => {
    const t = getTimeToExpiryInYears(environment.baseDate, leg.expiry);
    const iv = (leg.ivOverride !== null && leg.ivOverride !== undefined) ? leg.ivOverride : environment.globalIV;
    const bsm = calculateBSM(environment.spotPrice, leg.strike, t, environment.interestRate / 100, iv / 100, leg.type);
    const autoPrice = Math.max(0.05, Math.round(bsm.price * 20) / 20);
    handleUpdateLeg(leg.id, { entryPrice: autoPrice });
  };

  const fmtCurrency = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${environment.currency}${Math.round(val).toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm transition-colors">
      {/* Table Top Actions */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/90">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Position Legs Engine
            <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
              ({legs.filter(l => l.enabled).length}/{legs.length} active)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define unlimited option and futures legs. Toggle checkboxes to observe structural shifts in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {legs.length > 0 && (
            <button
              onClick={() => {
                const allEnabled = legs.every(l => l.enabled);
                onChangeLegs(legs.map(l => ({ ...l, enabled: !allEnabled })));
              }}
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {legs.every(l => l.enabled) ? 'Disable All' : 'Enable All'}
            </button>
          )}

          <button
            onClick={handleAddLeg}
            className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-slate-950 dark:text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add Custom Leg</span>
          </button>
        </div>
      </div>

      {/* High-density responsive table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              <th className="py-2.5 px-3 w-10 text-center">Active</th>
              <th className="py-2.5 px-3 w-28">Action</th>
              <th className="py-2.5 px-3 w-28">Type</th>
              <th className="py-2.5 px-3 w-32">Strike</th>
              <th className="py-2.5 px-3 w-36">Expiry Date</th>
              <th className="py-2.5 px-3 w-28">Lots / Qty</th>
              <th className="py-2.5 px-3 w-36">Entry Premium</th>
              <th className="py-2.5 px-3 w-24">Leg IV %</th>
              <th className="py-2.5 px-3 text-right">Target Theo.</th>
              <th className="py-2.5 px-3 text-right">Target P&L</th>
              <th className="py-2.5 px-3 text-right">Leg Greeks</th>
              <th className="py-2.5 px-3 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {legs.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500">
                  <p className="text-sm font-sans mb-2 text-slate-600 dark:text-slate-400">No option legs in current portfolio.</p>
                  <button
                    onClick={handleAddLeg}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-sans transition-colors"
                  >
                    <Plus size={13} /> Add First Leg
                  </button>
                </td>
              </tr>
            ) : (
              legs.map((leg) => {
                const val = valuations.find(v => v.legId === leg.id);
                const totalQty = leg.lots * leg.lotSize;

                return (
                  <tr
                    key={leg.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      !leg.enabled ? 'opacity-40 bg-slate-50/50 dark:bg-slate-950/40' : ''
                    }`}
                  >
                    {/* 1. Enabled Toggle */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleUpdateLeg(leg.id, { enabled: !leg.enabled })}
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1"
                        title={leg.enabled ? 'Disable leg' : 'Enable leg'}
                      >
                        {leg.enabled ? (
                          <CheckSquare size={16} className="text-cyan-600 dark:text-cyan-400" />
                        ) : (
                          <Square size={16} className="text-slate-400 dark:text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* 2. Action (Buy / Sell) */}
                    <td className="py-2.5 px-3">
                      <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-0.5 w-fit">
                        <button
                          type="button"
                          onClick={() => handleUpdateLeg(leg.id, { action: 'BUY' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans transition-colors ${
                            leg.action === 'BUY'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateLeg(leg.id, { action: 'SELL' })}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans transition-colors ${
                            leg.action === 'SELL'
                              ? 'bg-rose-600 text-white shadow'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </td>

                    {/* 3. Option Type (Call / Put / Future) */}
                    <td className="py-2.5 px-3">
                      <select
                        value={leg.type}
                        onChange={(e) => handleUpdateLeg(leg.id, { type: e.target.value as OptionType })}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2 py-1 text-xs font-sans font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <option value="CALL">Call (CE)</option>
                        <option value="PUT">Put (PE)</option>
                        <option value="FUTURE">Future / Eq</option>
                      </select>
                    </td>

                    {/* 4. Strike Price */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={leg.strike}
                          onChange={(e) => handleUpdateLeg(leg.id, { strike: parseFloat(e.target.value) || 0 })}
                          className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </td>

                    {/* 5. Expiry Date */}
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={leg.expiry}
                        onChange={(e) => handleUpdateLeg(leg.id, { expiry: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* 6. Lots / Lot Size */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={leg.lots}
                          onChange={(e) => handleUpdateLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-white font-mono text-xs text-center focus:outline-none focus:border-cyan-500"
                          title="Number of Lots"
                        />
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">×</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={leg.lotSize}
                          onChange={(e) => handleUpdateLeg(leg.id, { lotSize: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-900 dark:text-white font-mono text-xs text-center focus:outline-none focus:border-cyan-500"
                          title="Lot Size"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-500 block mt-0.5">
                        = {totalQty.toLocaleString()} units
                      </span>
                    </td>

                    {/* 7. Entry Premium */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{environment.currency}</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={leg.entryPrice}
                          onChange={(e) => handleUpdateLeg(leg.id, { entryPrice: parseFloat(e.target.value) || 0 })}
                          className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAutoPrice(leg)}
                          className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Auto-calculate theoretical BSM entry premium"
                        >
                          <Calculator size={13} />
                        </button>
                      </div>
                    </td>

                    {/* 8. IV Override */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.5"
                        placeholder={`${environment.globalIV}%`}
                        value={leg.ivOverride ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          handleUpdateLeg(leg.id, { ivOverride: isNaN(val as number) ? null : val });
                        }}
                        className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-amber-600 dark:text-amber-300 font-mono text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                        title="Override IV for this specific leg (blank = use global IV)"
                      />
                    </td>

                    {/* 9. Target Theoretical Price */}
                    <td className="py-2.5 px-3 text-right">
                      {val ? (
                        <div>
                          <div className="text-cyan-700 dark:text-cyan-300 font-semibold">
                            {environment.currency}{val.targetValue.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 block">
                            (was {environment.currency}{leg.entryPrice.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 10. Target P&L */}
                    <td className="py-2.5 px-3 text-right">
                      {val ? (
                        <div>
                          <div className={`font-bold flex items-center justify-end gap-0.5 ${
                            val.targetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {val.targetPnL >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {fmtCurrency(val.targetPnL)}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            Exp: {fmtCurrency(val.expiryPnL)}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 11. Leg Greeks */}
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 dark:text-slate-400">
                      {val ? (
                        <div className="flex flex-col items-end">
                          <span className={val.greeks.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            Δ {val.greeks.delta.toFixed(1)}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Θ {environment.currency}{Math.round(val.greeks.theta)}/d
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 12. Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onLockSingleLeg(leg.id)}
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Lock entry premium to target theoretical value"
                        >
                          <Sparkles size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateLeg(leg)}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Duplicate Leg"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeg(leg.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Delete Leg"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
