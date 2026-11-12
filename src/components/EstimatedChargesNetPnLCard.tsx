import React, { useState } from 'react';
import { OptionLeg, MarketEnvironment, PositionMetrics } from '../types/options';
import { calculateNetPnL, calculateIndianOptionsCharges } from '../utils/indianChargesCalculator';
import {
  Receipt,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface EstimatedChargesNetPnLCardProps {
  legs: OptionLeg[];
  environment: MarketEnvironment;
  metrics: PositionMetrics;
}

export const EstimatedChargesNetPnLCard: React.FC<EstimatedChargesNetPnLCardProps> = ({
  legs,
  environment,
  metrics
}) => {
  const [selectedPnLMode, setSelectedPnLMode] = useState<'target' | 'expiry' | 'maxProfit'>('target');
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState<boolean>(true);

  const activeLegs = legs.filter(l => l.enabled);

  // Determine gross P&L based on selected mode
  let grossPnL = metrics.totalTargetPnL;
  let modeLabel = 'Target Scenario P&L';

  if (selectedPnLMode === 'expiry') {
    grossPnL = metrics.totalExpiryPnL;
    modeLabel = 'At Expiry P&L';
  } else if (selectedPnLMode === 'maxProfit') {
    grossPnL = typeof metrics.maxProfit === 'number' ? metrics.maxProfit : metrics.totalTargetPnL;
    modeLabel = typeof metrics.maxProfit === 'number' ? 'Max Possible Profit' : 'Target Scenario P&L';
  }

  const { charges, netPnL, chargesRatio } = calculateNetPnL(grossPnL, legs);

  const isNetPositive = netPnL >= 0;
  const isGrossPositive = grossPnL >= 0;

  const fmt = (val: number) => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return `${sign}${environment.currency}${Math.abs(Math.round(val * 100) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const fmtCharge = (val: number) => {
    return `${environment.currency}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
      {/* 1. Header with Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Estimated Charges & Net P&L
            </h3>
            <p className="text-xs text-slate-500">
              Indian brokerage (₹20/order), STT, GST, Exchange txn, SEBI charges & Stamp Duty
            </p>
          </div>
        </div>

        {/* Mode Selector Toggle: Target P&L vs Expiry P&L vs Max Profit */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedPnLMode('target')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              selectedPnLMode === 'target'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Target Date
          </button>
          <button
            type="button"
            onClick={() => setSelectedPnLMode('expiry')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              selectedPnLMode === 'expiry'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            At Expiry
          </button>
          {typeof metrics.maxProfit === 'number' && (
            <button
              type="button"
              onClick={() => setSelectedPnLMode('maxProfit')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                selectedPnLMode === 'maxProfit'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Max Profit
            </button>
          )}
        </div>
      </div>

      {/* 2. Three Primary KPI Metric Badges: Gross P&L, Total Charges, Net P&L */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: Gross P&L */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Gross P&L</span>
            <span className="text-[10px] font-mono text-slate-400">({modeLabel})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${
                isGrossPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {fmt(grossPnL)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Theoretical P&L before tax & brokerage deductions
          </span>
        </div>

        {/* Metric 2: Total Charges */}
        <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span className="font-medium">Total Charges & Taxes</span>
            <span className="text-[10px] font-mono font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
              {charges.orderCount} Orders
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-amber-900">
              {fmtCharge(charges.totalCharges)}
            </span>
          </div>
          <span className="text-[10px] text-amber-700/80 mt-1 block">
            {chargesRatio > 0 ? `${chargesRatio}% of gross profit` : 'Brokerage, STT, GST & Govt levies'}
          </span>
        </div>

        {/* Metric 3: Net P&L (Highlighted) */}
        <div
          className={`p-3.5 border rounded-xl flex flex-col justify-between ${
            isNetPositive
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-slate-900">Net Take-Home P&L</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                isNetPositive
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}
            >
              {isNetPositive ? 'In Profit' : 'In Loss'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${
                isNetPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {fmt(netPnL)}
            </span>
          </div>
          <span className="text-[10px] text-slate-600 mt-1 block font-medium">
            Actual credited / debited to your trading ledger
          </span>
        </div>
      </div>

      {/* 3. Detailed Itemized Indian Taxes & Charges Breakdown Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetailedBreakdown(prev => !prev)}
          className="w-full bg-slate-50 hover:bg-slate-100/80 px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span>Itemized Tax & Statutory Charges Breakdown</span>
            <span className="text-[11px] font-mono text-slate-400">
              (₹{charges.totalCharges.toFixed(2)})
            </span>
          </div>
          {showDetailedBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showDetailedBreakdown && (
          <div className="p-4 bg-white flex flex-col gap-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-2">Charge Head</th>
                    <th className="py-2 px-2">Rate / Rule</th>
                    <th className="py-2 px-2 text-center">Basis</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {/* Brokerage */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      Brokerage
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      ₹20 flat per executed order
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      {charges.orderCount} orders (Entry + Exit)
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.brokerage)}
                    </td>
                  </tr>

                  {/* STT */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      STT (Securities Transaction Tax)
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      0.1% on sell side option premium
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      Sell Turnover
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.stt)}
                    </td>
                  </tr>

                  {/* Exchange Txn Charges */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      Exchange Transaction Charges
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      0.05% of premium turnover (NSE/BSE)
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      Total Turnover
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.exchangeTxnCharge)}
                    </td>
                  </tr>

                  {/* GST */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      GST (Goods and Services Tax)
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      18% on (Brokerage + Exchange + SEBI)
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      Service value
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.gst)}
                    </td>
                  </tr>

                  {/* SEBI Charges */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      SEBI Turnover Charges
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      ₹10 per crore (0.0001%)
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      Total Turnover
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.sebiCharges)}
                    </td>
                  </tr>

                  {/* Stamp Duty */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 font-sans font-semibold text-slate-900">
                      Stamp Duty
                    </td>
                    <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">
                      0.003% on buy side premium turnover
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-sans text-[11px]">
                      Buy Turnover
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">
                      {fmtCharge(charges.stampDuty)}
                    </td>
                  </tr>

                  {/* Total Charges Row */}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td colSpan={3} className="py-2.5 px-2 font-sans">
                      Total Estimated Charges & Statutory Taxes
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-amber-800 text-sm">
                      {fmtCharge(charges.totalCharges)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Explanatory note */}
            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
              <span>
                Standard discount broker rates (Zerodha/Groww style: ₹20/order). STT is levied exclusively on the sell side of premium turnover in Indian equity options contracts as per Indian tax laws.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
