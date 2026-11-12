import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  GitCompare,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Check,
  Percent,
  Coins,
  Scale,
  Sparkles,
  Info,
  ZoomIn,
  CheckCircle2,
  Layers,
  ChevronDown,
  Download,
  FileCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  OptionLeg,
  MarketEnvironment,
  WhatIfParameters,
  PositionMetrics,
  PayoffDataPoint
} from '../types/options';
import {
  STRATEGY_TEMPLATES,
  StrategyTemplate
} from '../data/strategyTemplates';
import {
  evaluatePosition,
  generatePayoffCurve
} from '../utils/blackScholes';
import { calculateEstimatedMargin } from '../utils/marginCalculator';
import { downloadTextContent } from '../utils/fileDownloader';

interface CompareStrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLegs: OptionLeg[];
  environment: MarketEnvironment;
  whatIf: WhatIfParameters;
  onApplyCompareStrategy: (legs: OptionLeg[]) => void;
}

export const CompareStrategiesModal: React.FC<CompareStrategiesModalProps> = ({
  isOpen,
  onClose,
  currentLegs,
  environment,
  whatIf,
  onApplyCompareStrategy
}) => {
  if (!isOpen) return null;

  // Selected Ready-Made Strategy ID for comparison (default to Iron Condor or Short Straddle)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('iron-condor');
  const [zoomRange, setZoomRange] = useState<number>(0.15); // +/- 15%
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group ready-made strategy templates by display category for clean dropdown
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, StrategyTemplate[]> = {
      'Neutral': [],
      'Bullish': [],
      'Bearish': [],
      'Others': []
    };

    STRATEGY_TEMPLATES.forEach(t => {
      const cat = t.displayCategory || 'Others';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });

    return groups;
  }, []);

  // Current selected ready-made template
  const selectedTemplate = useMemo(() => {
    return (
      STRATEGY_TEMPLATES.find(t => t.id === selectedTemplateId) ||
      STRATEGY_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  // Generate Compare strategy legs from the selected template
  const compareLegs = useMemo<OptionLeg[]>(() => {
    if (!selectedTemplate) return [];
    try {
      return selectedTemplate.createLegs(environment);
    } catch (e) {
      console.error('Failed to create legs for template', e);
      return [];
    }
  }, [selectedTemplate, environment]);

  // If current strategy has 0 legs, generate a starter fallback (or use empty)
  const activeCurrentLegs = useMemo(() => {
    return currentLegs.filter(l => l.enabled);
  }, [currentLegs]);

  // Calculate Metrics for Current Strategy
  const currentCalculations = useMemo(() => {
    const { valuations, metrics } = evaluatePosition(
      activeCurrentLegs,
      environment,
      whatIf
    );
    const margin = calculateEstimatedMargin(activeCurrentLegs);
    return { valuations, metrics, margin };
  }, [activeCurrentLegs, environment, whatIf]);

  // Calculate Metrics for Compared Ready-Made Strategy
  const compareCalculations = useMemo(() => {
    const { valuations, metrics } = evaluatePosition(
      compareLegs,
      environment,
      whatIf
    );
    const margin = calculateEstimatedMargin(compareLegs);
    return { valuations, metrics, margin };
  }, [compareLegs, environment, whatIf]);

  // Generate Payoff Curves for both strategies on identical spot spectrum
  const pointCount = 100;
  const currentPoints = useMemo<PayoffDataPoint[]>(() => {
    if (activeCurrentLegs.length === 0) {
      // If 0 legs, return baseline 0 PnL across range
      const centerSpot = environment.spotPrice;
      const minSpot = Math.max(1, centerSpot * (1 - zoomRange));
      const maxSpot = centerSpot * (1 + zoomRange);
      const step = (maxSpot - minSpot) / (pointCount - 1);
      const pts: PayoffDataPoint[] = [];
      for (let i = 0; i < pointCount; i++) {
        pts.push({
          spot: Math.round((minSpot + i * step) * 10) / 10,
          currentPnL: 0,
          targetPnL: 0,
          expiryPnL: 0
        });
      }
      return pts;
    }
    return generatePayoffCurve(activeCurrentLegs, environment, whatIf, zoomRange, pointCount);
  }, [activeCurrentLegs, environment, whatIf, zoomRange]);

  const comparePoints = useMemo<PayoffDataPoint[]>(() => {
    if (compareLegs.length === 0) return [];
    return generatePayoffCurve(compareLegs, environment, whatIf, zoomRange, pointCount);
  }, [compareLegs, environment, whatIf, zoomRange]);

  // Unified SVG bounds encompassing both curves
  const { minSpot, maxSpot, zeroY, spotToX, pnlToY, currentPath, comparePath } = useMemo(() => {
    const width = 900;
    const height = 360;
    const padding = { top: 25, bottom: 40, left: 65, right: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const minS = currentPoints[0]?.spot || environment.spotPrice * 0.85;
    const maxS = currentPoints[currentPoints.length - 1]?.spot || environment.spotPrice * 1.15;

    let pnlLowest = 0;
    let pnlHighest = 0;

    currentPoints.forEach(p => {
      pnlLowest = Math.min(pnlLowest, p.expiryPnL);
      pnlHighest = Math.max(pnlHighest, p.expiryPnL);
    });

    comparePoints.forEach(p => {
      pnlLowest = Math.min(pnlLowest, p.expiryPnL);
      pnlHighest = Math.max(pnlHighest, p.expiryPnL);
    });

    const span = Math.max(2000, pnlHighest - pnlLowest);
    const paddedMin = pnlLowest - span * 0.15;
    const paddedMax = pnlHighest + span * 0.15;

    const sToX = (s: number) => {
      const ratio = (s - minS) / (maxS - minS || 1);
      return padding.left + ratio * plotWidth;
    };

    const pToY = (pnl: number) => {
      const ratio = (pnl - paddedMin) / (paddedMax - paddedMin || 1);
      return padding.top + (1 - ratio) * plotHeight;
    };

    const zY = pToY(0);

    // Build SVG paths for both curves
    const buildPath = (pts: PayoffDataPoint[]) => {
      if (!pts || pts.length === 0) return '';
      return pts.reduce((acc, pt, idx) => {
        const x = sToX(pt.spot);
        const y = pToY(pt.expiryPnL);
        return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }, '');
    };

    return {
      minSpot: minS,
      maxSpot: maxS,
      zeroY: zY,
      spotToX: sToX,
      pnlToY: pToY,
      currentPath: buildPath(currentPoints),
      comparePath: buildPath(comparePoints)
    };
  }, [currentPoints, comparePoints, environment.spotPrice]);

  // Mouse move handler for hover tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.min(currentPoints.length - 1, Math.max(0, Math.round(ratio * (currentPoints.length - 1))));
    setHoveredIndex(idx);
  };

  const [downloadFeedback, setDownloadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    filename?: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Download comparison data as CSV report
  const handleDownloadComparisonReport = async () => {
    setIsExporting(true);
    setDownloadFeedback(null);
    try {
      const csvHeader = 'Strategy,Metric,Value\n';
      const rows = [
        `"Current Strategy","Active Legs Count",${activeCurrentLegs.length}`,
        `"Current Strategy","Margin Required (INR)",${currentCalculations.margin.totalMargin}`,
        `"Current Strategy","Max Profit",${typeof currentCalculations.metrics.maxProfit === 'number' ? currentCalculations.metrics.maxProfit : '"' + currentCalculations.metrics.maxProfit + '"'}`,
        `"Current Strategy","Max Loss",${typeof currentCalculations.metrics.maxLoss === 'number' ? currentCalculations.metrics.maxLoss : '"' + currentCalculations.metrics.maxLoss + '"'}`,
        `"Current Strategy","Probability of Profit (%)",${currentCalculations.metrics.probabilityOfProfit}`,
        `"Current Strategy","Risk-Reward Ratio","${currentCalculations.metrics.riskRewardRatio}"`,
        `"Current Strategy","Breakevens","${currentCalculations.metrics.breakevens.join(' - ') || 'None'}"`,
        `"Compared: ${selectedTemplate.name}","Active Legs Count",${compareLegs.length}`,
        `"Compared: ${selectedTemplate.name}","Margin Required (INR)",${compareCalculations.margin.totalMargin}`,
        `"Compared: ${selectedTemplate.name}","Max Profit",${typeof compareCalculations.metrics.maxProfit === 'number' ? compareCalculations.metrics.maxProfit : '"' + compareCalculations.metrics.maxProfit + '"'}`,
        `"Compared: ${selectedTemplate.name}","Max Loss",${typeof compareCalculations.metrics.maxLoss === 'number' ? compareCalculations.metrics.maxLoss : '"' + compareCalculations.metrics.maxLoss + '"'}`,
        `"Compared: ${selectedTemplate.name}","Probability of Profit (%)",${compareCalculations.metrics.probabilityOfProfit}`,
        `"Compared: ${selectedTemplate.name}","Risk-Reward Ratio","${compareCalculations.metrics.riskRewardRatio}"`,
        `"Compared: ${selectedTemplate.name}","Breakevens","${compareCalculations.metrics.breakevens.join(' - ') || 'None'}"`
      ];
      const csvContent = csvHeader + rows.join('\n');
      const filename = `TradeLab_Compare_${environment.symbol}_${selectedTemplate.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      const res = await downloadTextContent(csvContent, filename, 'text/csv;charset=utf-8');

      if (res.success) {
        setDownloadFeedback({
          type: 'success',
          message: `Comparison report downloaded successfully!`,
          filename
        });
      } else {
        setDownloadFeedback({
          type: 'error',
          message: res.message || 'Download failed. Please check browser permissions.'
        });
      }
    } catch (e: any) {
      setDownloadFeedback({
        type: 'error',
        message: 'Failed to download comparison report.'
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setDownloadFeedback(null), 5000);
    }
  };

  const handleApplyStrategy = () => {
    onApplyCompareStrategy(compareLegs);
    setApplyFeedback(`Loaded ${selectedTemplate.name} into Editor!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Helper formatters
  const formatCurrency = (val: number | string | undefined) => {
    if (val === undefined) return '₹0';
    if (typeof val === 'string') return val;
    const sign = val >= 0 ? '+' : '-';
    return `${sign}₹${Math.abs(Math.round(val)).toLocaleString()}`;
  };

  const formatMarginVal = (val: number) => `₹${Math.round(val).toLocaleString()}`;

  const currentHoverPt = hoveredIndex !== null ? currentPoints[hoveredIndex] : null;
  const compareHoverPt = hoveredIndex !== null ? comparePoints[hoveredIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* ============================================================== */}
        {/* 1. MODAL HEADER & CONTROLS                                     */}
        {/* ============================================================== */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <GitCompare size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Compare Strategies</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                  {environment.symbol} @ ₹{environment.spotPrice.toLocaleString()}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Split-screen comparison: Current Strategy vs. Ready-Made Strategy on the same Payoff graph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Comparison Report Button */}
            <button
              type="button"
              onClick={handleDownloadComparisonReport}
              disabled={isExporting}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download comparison report as CSV data file"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="animate-spin text-amber-500" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download size={13} className="text-amber-500" />
                  <span>Download Report</span>
                </>
              )}
            </button>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="px-2 text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                <ZoomIn size={11} /> Zoom:
              </span>
              {[0.10, 0.15, 0.25].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setZoomRange(val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    zoomRange === val
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ±{(val * 100).toFixed(0)}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close compare modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. SCROLLABLE CONTENT BODY                                     */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
          {/* Download Feedback Banner */}
          {downloadFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150 ${
                downloadFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {downloadFeedback.type === 'success' ? (
                  <FileCheck size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-bold block truncate">{downloadFeedback.message}</span>
                  {downloadFeedback.filename && (
                    <span className="font-mono text-[11px] opacity-80 block truncate">
                      File: {downloadFeedback.filename} (Mobile & Desktop ready)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDownloadFeedback(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold px-1.5 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Feedback banner if strategy adopted */}
          {applyFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{applyFeedback}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* A. DUAL PAYOFF GRAPH (Blue for Current, Orange for Compare)   */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col gap-2">
            {/* Graph Legend & Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Current Strategy Legend (Blue) */}
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-4 h-1 bg-blue-600 rounded-full" />
                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                    Current Strategy
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({activeCurrentLegs.length} leg{activeCurrentLegs.length === 1 ? '' : 's'})
                  </span>
                </div>

                {/* Compare Strategy Legend (Orange) */}
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-4 h-1 bg-orange-500 rounded-full" />
                  <span className="text-orange-600 dark:text-orange-400 font-bold">
                    Compared: {selectedTemplate.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({compareLegs.length} leg{compareLegs.length === 1 ? '' : 's'})
                  </span>
                </div>
              </div>

              {/* Zero reference hint */}
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span>0 Line: Breakeven</span>
                <span>•</span>
                <span>Spot: ₹{environment.spotPrice}</span>
              </div>
            </div>

            {/* SVG Canvas Container */}
            <div
              ref={containerRef}
              className="relative w-full aspect-[21/9] min-h-[260px] max-h-[320px] select-none cursor-crosshair"
            >
              <svg
                viewBox="0 0 900 360"
                className="w-full h-full overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Horizontal Zero P&L Axis */}
                <line
                  x1="65"
                  y1={zeroY}
                  x2="870"
                  y2={zeroY}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x="58"
                  y={zeroY + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  0
                </text>

                {/* Current Underlying Spot Marker */}
                {(() => {
                  const x = spotToX(environment.spotPrice);
                  if (x < 65 || x > 870) return null;
                  return (
                    <g>
                      <line
                        x1={x}
                        y1="25"
                        x2={x}
                        y2="320"
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={x - 34}
                        y="10"
                        width="68"
                        height="16"
                        rx="3"
                        fill="#0f172a"
                      />
                      <text
                        x={x}
                        y="21.5"
                        fill="#ffffff"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="JetBrains Mono"
                        fontWeight="600"
                      >
                        Spot {environment.spotPrice}
                      </text>
                    </g>
                  );
                })()}

                {/* 1. Current Strategy Payoff Curve (BLUE) */}
                {currentPath && (
                  <path
                    d={currentPath}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 2. Compared Ready-Made Strategy Payoff Curve (ORANGE) */}
                {comparePath && (
                  <path
                    d={comparePath}
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Breakeven Pins for Current Strategy (Blue) */}
                {currentCalculations.metrics.breakevens.map((be: number, idx: number) => {
                  const x = spotToX(be);
                  if (x < 65 || x > 870) return null;
                  return (
                    <g key={`cur-be-${idx}`}>
                      <circle cx={x} cy={zeroY} r="3" fill="#2563EB" stroke="#ffffff" strokeWidth="1" />
                      <rect x={x - 22} y={zeroY - 17} width="44" height="13" rx="2" fill="#dbeafe" stroke="#2563EB" strokeWidth="1" />
                      <text x={x} y={zeroY - 7.5} fill="#1e40af" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700">
                        BE {be}
                      </text>
                    </g>
                  );
                })}

                {/* Breakeven Pins for Compare Strategy (Orange) */}
                {compareCalculations.metrics.breakevens.map((be: number, idx: number) => {
                  const x = spotToX(be);
                  if (x < 65 || x > 870) return null;
                  return (
                    <g key={`cmp-be-${idx}`}>
                      <circle cx={x} cy={zeroY} r="3" fill="#EA580C" stroke="#ffffff" strokeWidth="1" />
                      <rect x={x - 22} y={zeroY + 5} width="44" height="13" rx="2" fill="#ffedd5" stroke="#EA580C" strokeWidth="1" />
                      <text x={x} y={zeroY + 14.5} fill="#c2410c" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700">
                        BE {be}
                      </text>
                    </g>
                  );
                })}

                {/* Hover Crosshair */}
                {currentHoverPt && compareHoverPt && (() => {
                  const x = spotToX(currentHoverPt.spot);
                  const yCur = pnlToY(currentHoverPt.expiryPnL);
                  const yCmp = pnlToY(compareHoverPt.expiryPnL);
                  return (
                    <g>
                      <line x1={x} y1="25" x2={x} y2="320" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                      <circle cx={x} cy={yCur} r="5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx={x} cy={yCmp} r="5" fill="#EA580C" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  );
                })()}
              </svg>

              {/* Hover HUD Tooltip */}
              {currentHoverPt && compareHoverPt && (
                <div
                  className="absolute top-2 pointer-events-none bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 shadow-xl rounded-lg p-2.5 text-xs font-mono z-30 min-w-[210px]"
                  style={{
                    left: `${Math.min(75, Math.max(10, ((spotToX(currentHoverPt.spot) / 900) * 100)))}%`
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5 font-bold">
                    <span>Spot: ₹{currentHoverPt.spot.toLocaleString()}</span>
                    <span className={currentHoverPt.spot >= environment.spotPrice ? 'text-emerald-600' : 'text-rose-600'}>
                      {(((currentHoverPt.spot - environment.spotPrice) / environment.spotPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-3 text-blue-700 dark:text-blue-400">
                      <span>🔵 Current P&L:</span>
                      <span className="font-bold">{formatCurrency(currentHoverPt.expiryPnL)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-orange-600 dark:text-orange-400">
                      <span>🟠 {selectedTemplate.name}:</span>
                      <span className="font-bold">{formatCurrency(compareHoverPt.expiryPnL)}</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Difference:</span>
                      <span className={`font-bold ${compareHoverPt.expiryPnL >= currentHoverPt.expiryPnL ? 'text-orange-600' : 'text-blue-600'}`}>
                        {compareHoverPt.expiryPnL >= currentHoverPt.expiryPnL
                          ? `Compare +₹${(compareHoverPt.expiryPnL - currentHoverPt.expiryPnL).toLocaleString()}`
                          : `Current +₹${(currentHoverPt.expiryPnL - compareHoverPt.expiryPnL).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Spot Range */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span>Min Range: ₹{minSpot.toLocaleString()}</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Underlying Nifty Spot Price Range</span>
              <span>Max Range: ₹{maxSpot.toLocaleString()}</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* B. SIDE-BY-SIDE COMPARISON TABLE                             */}
          {/* Margin Required, Max Profit, Max Loss, POP                   */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scale size={14} className="text-amber-500" />
                <span>Side-by-Side Risk & Return Metrics</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Direct benchmark comparison
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 w-1/3">Metric</th>
                    <th className="py-2.5 px-4 w-1/3 text-blue-700 dark:text-blue-400 font-bold bg-blue-50/40 dark:bg-blue-950/20">
                      🔵 Current Strategy
                    </th>
                    <th className="py-2.5 px-4 w-1/3 text-orange-600 dark:text-orange-400 font-bold bg-orange-50/40 dark:bg-orange-950/20">
                      🟠 {selectedTemplate.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {/* 1. Margin Required */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Coins size={14} className="text-amber-500" />
                      <span>Estimated Margin Required</span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white font-bold bg-blue-50/20 dark:bg-blue-950/10">
                      <div>
                        <span className="text-sm">{formatMarginVal(currentCalculations.margin.totalMargin)}</span>
                        {currentCalculations.margin.isEntirelyBuy && (
                          <span className="block text-[10px] text-slate-400 font-sans font-normal">
                            (Premium Paid)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white font-bold bg-orange-50/20 dark:bg-orange-950/10">
                      <div className="flex items-center justify-between gap-2">
                        <span>{formatMarginVal(compareCalculations.margin.totalMargin)}</span>
                        {compareCalculations.margin.totalMargin < currentCalculations.margin.totalMargin && (
                          <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            ₹{(currentCalculations.margin.totalMargin - compareCalculations.margin.totalMargin).toLocaleString()} Lower
                          </span>
                        )}
                        {currentCalculations.margin.totalMargin < compareCalculations.margin.totalMargin && activeCurrentLegs.length > 0 && (
                          <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Current Lower
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* 2. Max Profit */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-500" />
                      <span>Max Profit</span>
                    </td>
                    <td className="py-3 px-4 font-bold bg-blue-50/20 dark:bg-blue-950/10">
                      <span className={currentCalculations.metrics.maxProfit === 'Unlimited' ? 'text-emerald-600 dark:text-emerald-400 text-sm' : 'text-emerald-600 dark:text-emerald-400 text-sm'}>
                        {formatCurrency(currentCalculations.metrics.maxProfit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold bg-orange-50/20 dark:bg-orange-950/10">
                      <span className={compareCalculations.metrics.maxProfit === 'Unlimited' ? 'text-emerald-600 dark:text-emerald-400 text-sm' : 'text-emerald-600 dark:text-emerald-400 text-sm'}>
                        {formatCurrency(compareCalculations.metrics.maxProfit)}
                      </span>
                    </td>
                  </tr>

                  {/* 3. Max Loss */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrendingDown size={14} className="text-rose-500" />
                      <span>Max Loss</span>
                    </td>
                    <td className="py-3 px-4 font-bold bg-blue-50/20 dark:bg-blue-950/10">
                      <span className={currentCalculations.metrics.maxLoss === 'Unlimited' ? 'text-rose-600 dark:text-rose-400 text-sm' : 'text-rose-600 dark:text-rose-400 text-sm'}>
                        {formatCurrency(currentCalculations.metrics.maxLoss)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold bg-orange-50/20 dark:bg-orange-950/10">
                      <span className={compareCalculations.metrics.maxLoss === 'Unlimited' ? 'text-rose-600 dark:text-rose-400 text-sm' : 'text-rose-600 dark:text-rose-400 text-sm'}>
                        {formatCurrency(compareCalculations.metrics.maxLoss)}
                      </span>
                    </td>
                  </tr>

                  {/* 4. Probability of Profit (POP) */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Percent size={14} className="text-cyan-500" />
                      <span>Probability of Profit (POP)</span>
                    </td>
                    <td className="py-3 px-4 bg-blue-50/20 dark:bg-blue-950/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-blue-700 dark:text-blue-400">
                          {currentCalculations.metrics.probabilityOfProfit}%
                        </span>
                        <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, currentCalculations.metrics.probabilityOfProfit)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-orange-50/20 dark:bg-orange-950/10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-orange-600 dark:text-orange-400">
                            {compareCalculations.metrics.probabilityOfProfit}%
                          </span>
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${Math.min(100, compareCalculations.metrics.probabilityOfProfit)}%` }}
                            />
                          </div>
                        </div>

                        {compareCalculations.metrics.probabilityOfProfit > currentCalculations.metrics.probabilityOfProfit && (
                          <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            +{(compareCalculations.metrics.probabilityOfProfit - currentCalculations.metrics.probabilityOfProfit).toFixed(1)}% Edge
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* 5. Risk-Reward Ratio */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600 dark:text-slate-400 text-xs">
                      Risk / Reward Ratio
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10">
                      {currentCalculations.metrics.riskRewardRatio}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 bg-orange-50/20 dark:bg-orange-950/10">
                      {compareCalculations.metrics.riskRewardRatio}
                    </td>
                  </tr>

                  {/* 6. Breakeven Points */}
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-600 dark:text-slate-400 text-xs">
                      Breakeven Points
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10">
                      {currentCalculations.metrics.breakevens.length > 0
                        ? currentCalculations.metrics.breakevens.map((b: number) => `₹${b}`).join(' - ')
                        : 'None'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 bg-orange-50/20 dark:bg-orange-950/10">
                      {compareCalculations.metrics.breakevens.length > 0
                        ? compareCalculations.metrics.breakevens.map((b: number) => `₹${b}`).join(' - ')
                        : 'None'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* C. SPLIT-SCREEN STRATEGY BREAKDOWN                           */}
          {/* Left: Current Strategy | Right: Ready-Made Strategy Selector */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. LEFT PANEL: CURRENT STRATEGY */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-950 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Current Strategy
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {activeCurrentLegs.length} Leg{activeCurrentLegs.length === 1 ? '' : 's'}
                </span>
              </div>

              {activeCurrentLegs.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center text-slate-400">
                  <Layers size={28} className="mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    No active trades in your editor
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                    You can adopt the ready-made strategy on the right to start analyzing with 1 click.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                  {activeCurrentLegs.map(leg => (
                    <div
                      key={leg.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            leg.action === 'BUY'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {leg.action}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {leg.strike} {leg.type}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-600 dark:text-slate-400">
                        <span>{leg.lots} Lot ({leg.lots * leg.lotSize} Qty)</span>
                        <span className="block font-semibold text-slate-900 dark:text-slate-200">
                          @ ₹{leg.entryPrice}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. RIGHT PANEL: READY-MADE STRATEGY SELECTOR */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-orange-200 dark:border-orange-900/60 p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-orange-950 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select Ready-Made Strategy
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                  {selectedTemplate.displayCategory}
                </span>
              </div>

              {/* Ready-Made Strategy Dropdown */}
              <div className="relative">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                  Select Benchmark Template:
                </label>
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer pr-8"
                  >
                    {Object.entries(groupedTemplates).map(([category, templates]) => (
                      <optgroup key={category} label={`-- ${category} Strategies --`}>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.sentiment})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Template Description */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                {selectedTemplate.description}
              </p>

              {/* Legs preview of compared strategy */}
              <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1">
                {compareLegs.map(leg => (
                  <div
                    key={leg.id}
                    className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-orange-50/30 dark:bg-orange-950/20 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          leg.action === 'BUY'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {leg.action}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {leg.strike} {leg.type}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{leg.lots} Lot</span>
                      <span className="block font-semibold text-slate-900 dark:text-slate-200">
                        @ ₹{leg.entryPrice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adopt / Apply Button */}
              <button
                type="button"
                onClick={handleApplyStrategy}
                className="mt-1 w-full py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title={`Replace editor trades with ${selectedTemplate.name}`}
              >
                <Check size={14} />
                <span>Adopt {selectedTemplate.name} into Editor</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. MODAL FOOTER                                                */}
        {/* ============================================================== */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info size={13} className="text-slate-400" />
            <span>Hover on graph to view point-by-point P&L difference across spot levels.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApplyStrategy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Load Compared Strategy</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
