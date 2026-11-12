import React, { useRef, useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Calculator,
  ArrowRight,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  GitCompare,
  Download
} from 'lucide-react';
import {
  OptionLeg,
  MarketEnvironment,
  LegValuation,
  ManualPnLEntry,
  PositionMetrics,
  SavedStrategy,
  WhatIfParameters
} from '../types/options';
import { StrategyTemplate } from '../data/strategyTemplates';
import { ReadyMadeStrategiesSection, SubTabType } from './ReadyMadeStrategiesSection';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';
import {
  parseTradeScreenshot,
  BROKER_SAMPLE_PRESETS,
  BrokerSamplePreset,
  loadPresetTrades,
  ParsedTradeResult
} from '../utils/screenshotParser';
import { CalendarStrategyModal, CalendarSpreadType } from './CalendarStrategyModal';
import { calculateEstimatedMargin, formatMarginCurrency } from '../utils/marginCalculator';
import { CompareStrategiesModal } from './CompareStrategiesModal';
import { downloadTextContent } from '../utils/fileDownloader';

interface EditorViewProps {
  legs: OptionLeg[];
  onChangeLegs: (legs: OptionLeg[]) => void;
  environment: MarketEnvironment;
  valuations: LegValuation[];
  metrics: PositionMetrics;
  manualPnL: ManualPnLEntry;
  onChangeManualPnL: (entry: ManualPnLEntry) => void;
  onOpenManualPnLModal: () => void;
  onSelectStrategy: (template: StrategyTemplate, expiryDate: string) => void;
  activeSubTab: SubTabType;
  onSubTabChange: (tab: SubTabType) => void;
  savedCount: number;
  draftCount: number;
  onSwitchToPayoff: () => void;
  onParsedTradesFromScreenshot?: (result: ParsedTradeResult) => void;
  onAutoBuildCalendar?: (legs: OptionLeg[]) => void;
  savedStrategies?: SavedStrategy[];
  onLoadStrategy?: (strategy: SavedStrategy) => void;
  onDeleteStrategy?: (id: string) => void;
  onOpenSavePrompt?: () => void;
  whatIf?: WhatIfParameters;
}

export const EditorView: React.FC<EditorViewProps> = ({
  legs,
  onChangeLegs,
  environment,
  valuations,
  metrics,
  manualPnL,
  onChangeManualPnL,
  onOpenManualPnLModal,
  onSelectStrategy,
  activeSubTab,
  onSubTabChange,
  savedCount,
  draftCount,
  onSwitchToPayoff,
  onParsedTradesFromScreenshot,
  onAutoBuildCalendar,
  savedStrategies = [],
  onLoadStrategy,
  onDeleteStrategy,
  onOpenSavePrompt,
  whatIf
}) => {
  const hasTrades = legs.length > 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [calendarModalConfig, setCalendarModalConfig] = useState<{
    isOpen: boolean;
    type: CalendarSpreadType;
  }>({
    isOpen: false,
    type: 'calendar'
  });

  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const handleCalendarAutoBuild = (newLegs: OptionLeg[]) => {
    onChangeLegs(newLegs);
    if (onAutoBuildCalendar) {
      onAutoBuildCalendar(newLegs);
    }
    setNotification({
      type: 'success',
      message: `Auto-built ${calendarModalConfig.type === 'double-calendar' ? 'Double Calendar' : calendarModalConfig.type === 'triple-calendar' ? 'Triple Calendar' : 'Calendar Spread'} (${newLegs.length} legs)!`,
      details: 'Populated trades into main strategy and recalculated Greeks and Payoff curves'
    });
  };

  // File upload change handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers event
    event.target.value = '';

    setIsParsing(true);
    setParseStatus('Extracting trades via AI Vision OCR...');
    setNotification(null);

    try {
      const result = await parseTradeScreenshot(file, environment.spotPrice, environment.symbol);

      if (result.legs.length > 0) {
        // Automatically add parsed trade(s) to the strategy
        onChangeLegs(result.legs);
        if (onParsedTradesFromScreenshot) {
          onParsedTradesFromScreenshot(result);
        }

        setNotification({
          type: 'success',
          message: `Parsed ${result.legs.length} trade leg${result.legs.length > 1 ? 's' : ''} from ${result.brokerName || 'screenshot'}!`,
          details: result.source === 'gemini-vision'
            ? 'Processed with Gemini Vision OCR model'
            : 'Extracted with TradeLab Intelligent OCR Engine'
        });
      } else {
        setNotification({
          type: 'error',
          message: 'No active option or futures trades could be identified in the uploaded image.',
          details: 'Please ensure the screenshot shows the Trade Book, Position Book, or Order Book clearly.'
        });
      }
    } catch (err: any) {
      console.error('Screenshot parse failure:', err);
      setNotification({
        type: 'error',
        message: 'Could not process screenshot image.',
        details: err?.message || 'Please try another screenshot or one of the broker presets.'
      });
    } finally {
      setIsParsing(false);
      setParseStatus(null);
    }
  };

  // Sample broker preset loader
  const handleLoadSamplePreset = (preset: BrokerSamplePreset) => {
    setIsParsing(true);
    setParseStatus(`Simulating OCR parse for ${preset.broker}...`);
    setTimeout(() => {
      const result = loadPresetTrades(preset);
      onChangeLegs(result.legs);
      if (onParsedTradesFromScreenshot) {
        onParsedTradesFromScreenshot(result);
      }
      setIsParsing(false);
      setParseStatus(null);
      setNotification({
        type: 'success',
        message: `Extracted ${result.legs.length} trades from ${preset.title}!`,
        details: 'Loaded broker position structure with live BSM recalculation'
      });
    }, 600);
  };

  // Handler to build a new custom strategy (default ATM straddle or call spread)
  const handleBuildNewCustomStrategy = () => {
    const step = environment.spotPrice > 1000 ? 50 : 5;
    const atmStrike = Math.round(environment.spotPrice / step) * step;
    const expiry = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const lotSize = environment.symbol.includes('NIFTY') ? 50 : 100;

    const t = getTimeToExpiryInYears(environment.baseDate, expiry);
    const cPrem = calculateBSM(environment.spotPrice, atmStrike, t, environment.interestRate / 100, environment.globalIV / 100, 'CALL').price;
    const pPrem = calculateBSM(environment.spotPrice, atmStrike, t, environment.interestRate / 100, environment.globalIV / 100, 'PUT').price;

    const newLegs: OptionLeg[] = [
      {
        id: `leg-${Date.now()}-1`,
        name: 'Custom ATM Call',
        enabled: true,
        action: 'BUY',
        type: 'CALL',
        strike: atmStrike,
        expiry,
        lotSize,
        lots: 1,
        entryPrice: Math.max(1, Math.round(cPrem * 20) / 20)
      },
      {
        id: `leg-${Date.now()}-2`,
        name: 'Custom ATM Put',
        enabled: true,
        action: 'BUY',
        type: 'PUT',
        strike: atmStrike,
        expiry,
        lotSize,
        lots: 1,
        entryPrice: Math.max(1, Math.round(pPrem * 20) / 20)
      }
    ];

    onChangeLegs(newLegs);
  };

  // Add a single custom leg
  const handleAddSingleLeg = () => {
    const step = environment.spotPrice > 1000 ? 50 : 5;
    const strike = Math.round(environment.spotPrice / step) * step;
    const expiry = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const lotSize = environment.symbol.includes('NIFTY') ? 50 : 100;
    const t = getTimeToExpiryInYears(environment.baseDate, expiry);
    const prem = calculateBSM(environment.spotPrice, strike, t, environment.interestRate / 100, environment.globalIV / 100, 'CALL').price;

    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Leg ${legs.length + 1}`,
      enabled: true,
      action: 'BUY',
      type: 'CALL',
      strike,
      expiry,
      lotSize,
      lots: 1,
      entryPrice: Math.max(1, Math.round(prem * 20) / 20)
    };

    onChangeLegs([...legs, newLeg]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    onChangeLegs(legs.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleDeleteLeg = (id: string) => {
    onChangeLegs(legs.filter(l => l.id !== id));
  };

  const handleClearAll = () => {
    onChangeLegs([]);
    setNotification(null);
  };

  const handleAutoPrice = (leg: OptionLeg) => {
    const t = getTimeToExpiryInYears(environment.baseDate, leg.expiry);
    const iv = (leg.ivOverride ?? environment.globalIV) / 100;
    const bsm = calculateBSM(environment.spotPrice, leg.strike, t, environment.interestRate / 100, iv, leg.type);
    const autoPrice = Math.max(0.5, Math.round(bsm.price * 20) / 20);
    handleUpdateLeg(leg.id, { entryPrice: autoPrice });
  };

  // Download positions data as CSV document
  const handleDownloadStrategyCSV = async () => {
    if (legs.length === 0) return;
    try {
      const activeLegs = legs.filter(l => l.enabled);
      const csvHeader = 'Leg Name,Action,Strike,Type,Expiry,Lots,Lot Size,Quantity,Entry Price (INR)\n';
      const csvRows = activeLegs.map(l =>
        `"${l.name || 'Leg'}","${l.action}",${l.strike},"${l.type}","${l.expiry}",${l.lots},${l.lotSize},${l.lots * l.lotSize},${l.entryPrice}`
      ).join('\n');
      const csvContent = csvHeader + csvRows;
      const filename = `TradeLab_Positions_${environment.symbol}_${new Date().toISOString().slice(0, 10)}.csv`;
      const res = await downloadTextContent(csvContent, filename, 'text/csv;charset=utf-8');

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Positions downloaded successfully as ${filename}!`,
          details: 'Saved CSV document to your device (Compatible with Excel & Google Sheets)'
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Download failed. Please check browser permissions.'
        });
      }
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: 'Failed to download positions CSV.'
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hidden File Input for Trade Screenshot Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileUpload}
        className="hidden"
        aria-label="Upload trade screenshot"
      />

      {/* Parse Feedback Banner */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{notification.message}</p>
              {notification.details && (
                <p className="text-[11px] opacity-80 mt-0.5">{notification.details}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1 text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT AREA (Editor View) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {!hasTrades ? (
          /* ============================================================== */
          /* EMPTY STATE AS SPECIFIED                                       */
          /* ============================================================== */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
            {/* Document icon with text "No Trades Added" */}
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
              <FileText size={32} strokeWidth={1.75} />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-1">
              No Trades Added
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              Build a custom options structure, upload a broker screenshot, or pick a ready-made template below to analyze live payoff, Greeks, and P&L.
            </p>

            {/* Prominent blue button: "Build a new custom strategy" & "Compare" button */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleBuildNewCustomStrategy}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Build a new custom strategy</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                title="Compare your strategy side-by-side with ready-made strategies on the same payoff graph"
              >
                <GitCompare size={16} />
                <span>Compare</span>
              </button>
            </div>

            {/* 1. UI CHANGE: Secondary button right below "+ Build a new custom strategy" */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="mt-2.5 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 size={16} className="text-blue-600 animate-spin" />
                  <span>{parseStatus || 'Extracting Trades...'}</span>
                </>
              ) : (
                <>
                  <Camera size={16} className="text-blue-600" />
                  <span>📸 Upload Trade Screenshot</span>
                </>
              )}
            </button>

            {/* One-click Broker Sample presets */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>Or test OCR instantly with broker trade presets:</span>
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {BROKER_SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadSamplePreset(preset)}
                    disabled={isParsing}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ImageIcon size={11} className="text-slate-400" />
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* ACTIVE TRADES LIST / LEGS TABLE (SENSIBULL / ZERODHA STYLE)    */
          /* ============================================================== */
          <div className="flex flex-col">
            {/* Header Action Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Active Position Legs</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                    {legs.filter(l => l.enabled).length}/{legs.length} Active
                  </span>
                </span>
                {isParsing && (
                  <span className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing screenshot...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Compare Active Strategy with Ready-Made Strategies on the same Payoff chart"
                >
                  <GitCompare size={13} />
                  <span>Compare</span>
                </button>
                {/* Download Strategy CSV Button */}
                <button
                  type="button"
                  onClick={handleDownloadStrategyCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Download active strategy positions as CSV document"
                >
                  <Download size={13} className="text-slate-600" />
                  <span>Download CSV</span>
                </button>
                {/* Secondary upload screenshot button in table header */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Camera size={13} className="text-blue-600" />
                  <span>📸 Upload Screenshot</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSingleLeg}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus size={14} /> Add Leg
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Responsive Legs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">Active</th>
                    <th className="py-2.5 px-3 w-28">Action</th>
                    <th className="py-2.5 px-3 w-24">Type</th>
                    <th className="py-2.5 px-3 w-32">Strike</th>
                    <th className="py-2.5 px-3 w-36">Expiry</th>
                    <th className="py-2.5 px-3 w-28">Lots / Qty</th>
                    <th className="py-2.5 px-3 w-36">Entry Premium</th>
                    <th className="py-2.5 px-3 text-right">Theo. Value</th>
                    <th className="py-2.5 px-3 text-right">Delta (Δ)</th>
                    <th className="py-2.5 px-3 w-14 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {legs.map(leg => {
                    const val = valuations.find(v => v.legId === leg.id);
                    const isBuy = leg.action === 'BUY';

                    return (
                      <tr
                        key={leg.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !leg.enabled ? 'opacity-40 bg-slate-50/50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={leg.enabled}
                            onChange={(e) => handleUpdateLeg(leg.id, { enabled: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Action Pill (BUY / SELL) */}
                        <td className="py-2.5 px-3">
                          <div className="flex rounded-md overflow-hidden border border-slate-200 bg-slate-100 p-0.5 w-fit">
                            <button
                              type="button"
                              onClick={() => handleUpdateLeg(leg.id, { action: 'BUY' })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans transition-all cursor-pointer ${
                                isBuy
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              BUY
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeg(leg.id, { action: 'SELL' })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans transition-all cursor-pointer ${
                                !isBuy
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              SELL
                            </button>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <select
                            value={leg.type}
                            onChange={(e) => handleUpdateLeg(leg.id, { type: e.target.value as any })}
                            className="bg-white border border-slate-200 text-slate-900 rounded px-2 py-1 text-xs font-sans font-medium focus:outline-none focus:border-blue-500"
                          >
                            <option value="CALL">CE</option>
                            <option value="PUT">PE</option>
                            <option value="FUTURE">FUT</option>
                          </select>
                        </td>

                        {/* Strike */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            value={leg.strike}
                            onChange={(e) => handleUpdateLeg(leg.id, { strike: parseFloat(e.target.value) || 0 })}
                            className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>

                        {/* Expiry */}
                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            value={leg.expiry}
                            onChange={(e) => handleUpdateLeg(leg.id, { expiry: e.target.value })}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>

                        {/* Lots / Qty */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={leg.lots}
                              onChange={(e) => handleUpdateLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-10 bg-white border border-slate-300 rounded px-1 py-1 text-center text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-400 text-[10px]">×{leg.lotSize}</span>
                          </div>
                        </td>

                        {/* Entry Premium with Auto-Price Calculator */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-xs">{environment.currency}</span>
                            <input
                              type="number"
                              step="0.05"
                              value={leg.entryPrice}
                              onChange={(e) => handleUpdateLeg(leg.id, { entryPrice: parseFloat(e.target.value) || 0 })}
                              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAutoPrice(leg)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                              title="Auto-calculate theoretical BSM entry premium"
                            >
                              <Calculator size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Theo. Value */}
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {val ? `${environment.currency}${val.currentValue.toFixed(2)}` : '-'}
                        </td>

                        {/* Delta */}
                        <td className="py-2.5 px-3 text-right">
                          {val ? (
                            <span className={val.greeks.delta >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {val.greeks.delta >= 0 ? '+' : ''}{val.greeks.delta.toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>

                        {/* Delete */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLeg(leg.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove leg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Metrics Bar when legs are present */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500 block text-[10px]">Net Premium</span>
                  <span className={`font-mono font-bold ${metrics.netDebitCredit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {metrics.netDebitCredit >= 0 ? 'Credit ' : 'Debit '}
                    {environment.currency}{Math.abs(Math.round(metrics.netDebitCredit)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Est. Margin</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatMarginCurrency(calculateEstimatedMargin(legs).totalMargin, environment.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Max Profit</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {typeof metrics.maxProfit === 'number'
                      ? `${environment.currency}${Math.round(metrics.maxProfit).toLocaleString()}`
                      : 'Unlimited'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Max Loss</span>
                  <span className="font-mono font-bold text-rose-600">
                    {typeof metrics.maxLoss === 'number'
                      ? `${environment.currency}${Math.round(metrics.maxLoss).toLocaleString()}`
                      : 'Unlimited'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Probability of Profit</span>
                  <span className="font-mono font-bold text-blue-600">
                    {metrics.probabilityOfProfit}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSwitchToPayoff}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View Full Payoff Curve</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* GREY BAR AS SPECIFIED: Checkbox "Manual P&L" and               */}
        {/* "Add Manual P/L" button on the right                           */}
        {/* ============================================================== */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={manualPnL.enabled}
              onChange={(e) => onChangeManualPnL({ ...manualPnL, enabled: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Manual P&L
            </span>
            {manualPnL.enabled && manualPnL.amount !== 0 && (
              <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                manualPnL.amount >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {manualPnL.amount >= 0 ? '+' : ''}{environment.currency}{manualPnL.amount.toLocaleString()}
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={onOpenManualPnLModal}
            className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            Add Manual P/L
          </button>
        </div>
      </div>

      {/* 4. READY-MADE STRATEGIES SECTION (Bottom half of Editor View) */}
      <ReadyMadeStrategiesSection
        environment={environment}
        onSelectStrategy={onSelectStrategy}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        savedCount={savedCount}
        draftCount={draftCount}
        positionsCount={legs.length}
        onOpenCalendarModal={(type) => setCalendarModalConfig({ isOpen: true, type })}
        savedStrategies={savedStrategies}
        onLoadStrategy={onLoadStrategy}
        onDeleteStrategy={onDeleteStrategy}
        onOpenSavePrompt={onOpenSavePrompt}
        legs={legs}
      />

      {/* Calendar Spread Configuration Modal */}
      <CalendarStrategyModal
        isOpen={calendarModalConfig.isOpen}
        onClose={() => setCalendarModalConfig(prev => ({ ...prev, isOpen: false }))}
        strategyType={calendarModalConfig.type}
        environment={environment}
        onAutoBuild={handleCalendarAutoBuild}
      />

      {/* Compare Strategies Split-Screen Modal with Dual Payoff Chart & Side-by-Side Metrics */}
      <CompareStrategiesModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        currentLegs={legs}
        environment={environment}
        whatIf={whatIf || { targetSpot: environment.spotPrice, targetDate: environment.baseDate, targetIVShift: 0 }}
        onApplyCompareStrategy={(newLegs) => {
          onChangeLegs(newLegs);
          setNotification({
            type: 'success',
            message: `Loaded compared ready-made strategy into Editor (${newLegs.length} legs)!`,
            details: 'Updated all active position legs, Payoff curves, and risk metrics.'
          });
        }}
      />
    </div>
  );
};
