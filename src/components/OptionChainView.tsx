import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  Plus,
  Calendar,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  Info,
  Download
} from 'lucide-react';
import { MarketEnvironment, OptionLeg, OptionAction, OptionType } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';
import { getStrikeStep, roundToStrike, getExpiryDate } from '../data/strategyTemplates';
import { downloadTextContent } from '../utils/fileDownloader';

interface OptionChainViewProps {
  environment: MarketEnvironment;
  onAddLeg: (leg: OptionLeg) => void;
  onSwitchToEditor: () => void;
  currentLegsCount?: number;
}

interface StrikeRowData {
  strike: number;
  isAtm: boolean;
  isCallItm: boolean;
  isPutItm: boolean;
  callPrice: number;
  callDelta: number;
  callIv: number;
  callOi: number;
  putPrice: number;
  putDelta: number;
  putIv: number;
  putOi: number;
}

const EXPIRY_OPTIONS = [
  { label: '09 Nov (Near Weekly)', days: 7 },
  { label: '14 Nov (Weekly)', days: 14 },
  { label: '21 Nov (Weekly)', days: 21 },
  { label: '28 Nov (Monthly)', days: 28 },
  { label: '26 Dec (Next Month)', days: 56 }
];

export const OptionChainView: React.FC<OptionChainViewProps> = ({
  environment,
  onAddLeg,
  onSwitchToEditor,
  currentLegsCount = 0
}) => {
  const [selectedExpiryIndex, setSelectedExpiryIndex] = useState<number>(0);
  const [defaultAction, setDefaultAction] = useState<OptionAction>('BUY');
  const [rangeRadius, setRangeRadius] = useState<number>(6); // Number of strikes above and below ATM
  const [notification, setNotification] = useState<string | null>(null);

  // Compute selected expiry date string YYYY-MM-DD
  const selectedExpiry = useMemo(() => {
    const days = EXPIRY_OPTIONS[selectedExpiryIndex].days;
    return getExpiryDate(environment.baseDate, days);
  }, [environment.baseDate, selectedExpiryIndex]);

  // Determine strike step for asset (50 for NIFTY, 100 for BANKNIFTY)
  const step = useMemo(() => getStrikeStep(environment.spotPrice), [environment.spotPrice]);
  const atmStrike = useMemo(
    () => roundToStrike(environment.spotPrice, step),
    [environment.spotPrice, step]
  );

  // Generate strike rows around spot price (e.g. 24800 to 25300, step 50 for Nifty)
  const strikeRows: StrikeRowData[] = useMemo(() => {
    const t = getTimeToExpiryInYears(environment.baseDate, selectedExpiry);
    const r = environment.interestRate / 100;
    const iv = environment.globalIV / 100;
    const spot = environment.spotPrice;

    const rows: StrikeRowData[] = [];
    const minStrike = atmStrike - rangeRadius * step;
    const maxStrike = atmStrike + rangeRadius * step;

    for (let strike = minStrike; strike <= maxStrike; strike += step) {
      const isAtm = strike === atmStrike;
      const isCallItm = strike < spot;
      const isPutItm = strike > spot;

      // Calculate realistic BSM Call and Put metrics
      const callBsm = calculateBSM(spot, strike, t, r, iv, 'CALL');
      const putBsm = calculateBSM(spot, strike, t, r, iv, 'PUT');

      // Round premiums to realistic market ticks
      const callPrice = Math.max(0.5, Math.round(callBsm.price * 20) / 20);
      const putPrice = Math.max(0.5, Math.round(putBsm.price * 20) / 20);

      // Deterministic pseudo open-interest based on strike distance
      const dist = Math.abs(strike - spot);
      const callOi = Math.max(5000, Math.round((120000 - dist * 40) / 1000) * 1000);
      const putOi = Math.max(4500, Math.round((115000 - dist * 38) / 1000) * 1000);

      rows.push({
        strike,
        isAtm,
        isCallItm,
        isPutItm,
        callPrice,
        callDelta: Math.round(callBsm.delta * 100) / 100,
        callIv: Math.round(environment.globalIV * 10) / 10,
        callOi,
        putPrice,
        putDelta: Math.round(putBsm.delta * 100) / 100,
        putIv: Math.round(environment.globalIV * 10) / 10,
        putOi
      });
    }

    return rows;
  }, [environment, atmStrike, rangeRadius, selectedExpiry, step]);

  // Handler to add a specific Call or Put trade to the main strategy state
  const handleAddTrade = (strike: number, type: OptionType, premium: number, customAction?: OptionAction) => {
    const action = customAction || defaultAction;
    const lotSize = environment.symbol.includes('NIFTY') ? 50 : 100;
    const typeLabel = type === 'CALL' ? 'CE' : 'PE';

    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${environment.symbol} ${strike} ${typeLabel}`,
      enabled: true,
      action,
      type,
      strike,
      expiry: selectedExpiry,
      lotSize,
      lots: 1,
      entryPrice: premium
    };

    onAddLeg(newLeg);

    setNotification(`Added ${action} 1x ${environment.symbol} ${strike} ${typeLabel} @ ₹${premium}`);

    // Automatically switch back to Editor view as requested
    setTimeout(() => {
      onSwitchToEditor();
    }, 250);
  };

  // Download entire Option Chain matrix as CSV
  const handleDownloadOptionChainCSV = async () => {
    try {
      const csvHeader = 'Strike,Call Premium (LTP),Call Delta,Call IV (%),Put Premium (LTP),Put Delta,Put IV (%),Expiry\n';
      const rows = strikeRows.map(r =>
        `${r.strike},${r.callPrice},${r.callDelta.toFixed(3)},${r.callIv},${r.putPrice},${r.putDelta.toFixed(3)},${r.putIv},"${selectedExpiry}"`
      ).join('\n');
      const filename = `TradeLab_OptionChain_${environment.symbol}_${selectedExpiry}.csv`;
      const res = await downloadTextContent(csvHeader + rows, filename, 'text/csv;charset=utf-8');
      if (res.success) {
        setNotification(`Downloaded "${filename}" successfully!`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (e) {
      console.error('Failed to download option chain', e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. TOP CONTROL BAR (Spot Price, Expiry Selector, Action Toggle) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Underlying Symbol and Live Spot */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                {environment.symbol} Option Chain
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                Spot: ₹{environment.spotPrice.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              ATM Strike: <strong className="text-slate-800 font-mono">{atmStrike}</strong> • Step: {step}
            </p>
          </div>
        </div>

        {/* Center/Right: Expiry Dropdown, Default Action (BUY/SELL), and Strikes Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Expiry Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">Expiry:</span>
            <select
              value={selectedExpiryIndex}
              onChange={(e) => setSelectedExpiryIndex(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {EXPIRY_OPTIONS.map((opt, idx) => (
                <option key={opt.label} value={idx}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Selector (Default Buy or Sell) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Order:
            </span>
            <button
              type="button"
              onClick={() => setDefaultAction('BUY')}
              className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                defaultAction === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setDefaultAction('SELL')}
              className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                defaultAction === 'SELL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SELL
            </button>
          </div>

          {/* Download Option Chain Button */}
          <button
            type="button"
            onClick={handleDownloadOptionChainCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs"
            title="Download this Option Chain as CSV file"
          >
            <Download size={13} className="text-slate-600" />
            <span>Download CSV</span>
          </button>

          {/* Switch to Editor Shortcut */}
          <button
            type="button"
            onClick={onSwitchToEditor}
            className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Back to Editor</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Quick Notification Toast */}
      {notification && (
        <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span className="font-semibold">{notification}</span>
          </div>
          <span className="text-[11px] text-emerald-600">Switching to Editor...</span>
        </div>
      )}

      {/* 2. OPTION CHAIN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Table Top Header Guide */}
        <div className="grid grid-cols-12 text-center text-xs font-bold border-b border-slate-200 bg-slate-50 text-slate-700">
          <div className="col-span-5 py-2.5 border-r border-slate-200 bg-blue-50/40 text-blue-900">
            CALLS (CE)
          </div>
          <div className="col-span-2 py-2.5 border-r border-slate-200 bg-slate-100 font-extrabold text-slate-900">
            STRIKE PRICE
          </div>
          <div className="col-span-5 py-2.5 bg-amber-50/40 text-amber-900">
            PUTS (PE)
          </div>
        </div>

        {/* Responsive Table Scroll Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                {/* Call Columns */}
                <th className="py-2 px-3 text-center w-14">Action</th>
                <th className="py-2 px-3 text-right">Call LTP</th>
                <th className="py-2 px-3 text-right hidden sm:table-cell">Delta (Δ)</th>
                <th className="py-2 px-3 text-right hidden md:table-cell">OI</th>
                <th className="py-2 px-3 text-center w-24">Add Call</th>

                {/* Center Strike Column */}
                <th className="py-2 px-4 text-center bg-slate-100 font-extrabold text-slate-900 border-x border-slate-200 w-28">
                  Strike
                </th>

                {/* Put Columns */}
                <th className="py-2 px-3 text-center w-24">Add Put</th>
                <th className="py-2 px-3 text-left">Put LTP</th>
                <th className="py-2 px-3 text-left hidden sm:table-cell">Delta (Δ)</th>
                <th className="py-2 px-3 text-left hidden md:table-cell">OI</th>
                <th className="py-2 px-3 text-center w-14">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {strikeRows.map((row) => {
                const isAtm = row.isAtm;
                const isCallItm = row.isCallItm;
                const isPutItm = row.isPutItm;

                return (
                  <tr
                    key={row.strike}
                    className={`transition-colors hover:bg-blue-50/30 ${
                      isAtm ? 'bg-blue-50/50 font-semibold' : ''
                    }`}
                  >
                    {/* Call Direct Action Toggle */}
                    <td className={`py-2 px-2 text-center ${isCallItm ? 'bg-amber-50/40' : ''}`}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                        defaultAction === 'BUY' ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                      }`}>
                        {defaultAction}
                      </span>
                    </td>

                    {/* Call Premium (LTP) */}
                    <td className={`py-2 px-3 text-right font-bold text-slate-900 ${isCallItm ? 'bg-amber-50/40' : ''}`}>
                      <span className="text-slate-400 text-[10px] font-normal mr-0.5">₹</span>
                      {row.callPrice.toFixed(2)}
                    </td>

                    {/* Call Delta */}
                    <td className={`py-2 px-3 text-right hidden sm:table-cell text-slate-600 ${isCallItm ? 'bg-amber-50/40' : ''}`}>
                      {row.callDelta >= 0 ? `+${row.callDelta.toFixed(2)}` : row.callDelta.toFixed(2)}
                    </td>

                    {/* Call OI */}
                    <td className={`py-2 px-3 text-right hidden md:table-cell text-slate-400 text-[11px] ${isCallItm ? 'bg-amber-50/40' : ''}`}>
                      {(row.callOi / 1000).toFixed(0)}k
                    </td>

                    {/* 1. & 3. SPECIFIED: 'Add' button for Call */}
                    <td className={`py-2 px-2 text-center ${isCallItm ? 'bg-amber-50/40' : ''}`}>
                      <button
                        type="button"
                        onClick={() => handleAddTrade(row.strike, 'CALL', row.callPrice)}
                        className="w-full px-2.5 py-1 text-xs font-sans font-semibold rounded-md transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                        title={`Add ${defaultAction} ${environment.symbol} ${row.strike} Call`}
                      >
                        <Plus size={12} />
                        <span>Add Call</span>
                      </button>
                    </td>

                    {/* Center Strike Price Column */}
                    <td className={`py-2 px-4 text-center font-bold text-slate-900 border-x border-slate-200 ${
                      isAtm ? 'bg-blue-100 text-blue-900 font-black' : 'bg-slate-100'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.strike}</span>
                        {isAtm && (
                          <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-wider">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 1. & 3. SPECIFIED: 'Add' button for Put */}
                    <td className={`py-2 px-2 text-center ${isPutItm ? 'bg-amber-50/40' : ''}`}>
                      <button
                        type="button"
                        onClick={() => handleAddTrade(row.strike, 'PUT', row.putPrice)}
                        className="w-full px-2.5 py-1 text-xs font-sans font-semibold rounded-md transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"
                        title={`Add ${defaultAction} ${environment.symbol} ${row.strike} Put`}
                      >
                        <Plus size={12} />
                        <span>Add Put</span>
                      </button>
                    </td>

                    {/* Put Premium (LTP) */}
                    <td className={`py-2 px-3 text-left font-bold text-slate-900 ${isPutItm ? 'bg-amber-50/40' : ''}`}>
                      <span className="text-slate-400 text-[10px] font-normal mr-0.5">₹</span>
                      {row.putPrice.toFixed(2)}
                    </td>

                    {/* Put Delta */}
                    <td className={`py-2 px-3 text-left hidden sm:table-cell text-slate-600 ${isPutItm ? 'bg-amber-50/40' : ''}`}>
                      {row.putDelta.toFixed(2)}
                    </td>

                    {/* Put OI */}
                    <td className={`py-2 px-3 text-left hidden md:table-cell text-slate-400 text-[11px] ${isPutItm ? 'bg-amber-50/40' : ''}`}>
                      {(row.putOi / 1000).toFixed(0)}k
                    </td>

                    {/* Put Direct Action Toggle */}
                    <td className={`py-2 px-2 text-center ${isPutItm ? 'bg-amber-50/40' : ''}`}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                        defaultAction === 'BUY' ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                      }`}>
                        {defaultAction}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Guide */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span>
              <span>In-The-Money (ITM) Options</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span>
              <span>At-The-Money (ATM) Strike</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Range:</span>
            <button
              type="button"
              onClick={() => setRangeRadius(Math.max(3, rangeRadius - 2))}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Fewer Strikes
            </button>
            <button
              type="button"
              onClick={() => setRangeRadius(Math.min(15, rangeRadius + 2))}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              More Strikes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
