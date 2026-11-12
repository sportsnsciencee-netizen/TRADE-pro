import React, { useState, useRef, useMemo } from 'react';
import { OptionLeg, MarketEnvironment, WhatIfParameters } from '../types/options';
import { generatePayoffCurve } from '../utils/blackScholes';
import {
  Eye,
  EyeOff,
  ZoomIn,
  Crosshair,
  Share2,
  Bookmark,
  Loader2,
  Target,
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import { PayoffRiskSummaryBar } from './PayoffRiskSummaryBar';
import { captureAndDownloadPayoffChart } from '../utils/exportPayoffScreenshot';

interface PayoffChartProps {
  legs: OptionLeg[];
  environment: MarketEnvironment;
  whatIf: WhatIfParameters;
  onTargetSpotChange: (spot: number) => void;
  breakevens: number[];
  theme?: 'dark' | 'light';
  onSaveStrategy?: () => void;
  onShareComplete?: (dataUrl: string, filename: string) => void;
  onSetPriceAlert?: (targetPrice: number, condition: 'ABOVE_OR_EQUAL' | 'BELOW_OR_EQUAL', note: string) => void;
  onDownloadFeedback?: (success: boolean, filename: string, message: string) => void;
}

export const PayoffChart: React.FC<PayoffChartProps> = ({
  legs,
  environment,
  whatIf,
  onTargetSpotChange,
  breakevens,
  theme = 'dark',
  onSaveStrategy,
  onShareComplete,
  onSetPriceAlert,
  onDownloadFeedback
}) => {
  const isDark = theme === 'dark';

  const chartCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<number>(0.15); // +/- 15% default
  const [showTargetCurve, setShowTargetCurve] = useState<boolean>(true);
  const [showExpiryCurve, setShowExpiryCurve] = useState<boolean>(true);
  const [showCurrentCurve, setShowCurrentCurve] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. Target Profit & Stop Loss Level States (Default e.g. 5000 and -2000 as requested)
  const [targetProfit, setTargetProfit] = useState<number | null>(5000);
  const [stopLoss, setStopLoss] = useState<number | null>(-2000);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    filename?: string;
  } | null>(null);

  // Normalize Stop Loss to always be negative
  const normalizedSL = useMemo(() => {
    if (stopLoss === null || isNaN(stopLoss)) return null;
    return stopLoss > 0 ? -stopLoss : stopLoss;
  }, [stopLoss]);

  // Generate data points
  const points = useMemo(() => {
    return generatePayoffCurve(legs, environment, whatIf, zoomRange, 120);
  }, [legs, environment, whatIf, zoomRange]);

  // Determine coordinate bounds including Target and SL levels
  const { minSpot, maxSpot, minPnL, maxPnL, zeroY, spotToX, pnlToY } = useMemo(() => {
    if (points.length === 0) {
      return {
        minSpot: 0,
        maxSpot: 100,
        minPnL: -1000,
        maxPnL: 1000,
        zeroY: 200,
        spotToX: () => 0,
        pnlToY: () => 200
      };
    }

    const minS = points[0].spot;
    const maxS = points[points.length - 1].spot;

    let pnlLowest = 0;
    let pnlHighest = 0;

    points.forEach(p => {
      if (showExpiryCurve) {
        pnlLowest = Math.min(pnlLowest, p.expiryPnL);
        pnlHighest = Math.max(pnlHighest, p.expiryPnL);
      }
      if (showTargetCurve) {
        pnlLowest = Math.min(pnlLowest, p.targetPnL);
        pnlHighest = Math.max(pnlHighest, p.targetPnL);
      }
      if (showCurrentCurve) {
        pnlLowest = Math.min(pnlLowest, p.currentPnL);
        pnlHighest = Math.max(pnlHighest, p.currentPnL);
      }
    });

    // Ensure Target and Stop Loss levels are encompassed within graph Y bounds
    if (targetProfit !== null && !isNaN(targetProfit)) {
      pnlHighest = Math.max(pnlHighest, targetProfit);
    }
    if (normalizedSL !== null) {
      pnlLowest = Math.min(pnlLowest, normalizedSL);
    }

    // Provide padding for visual breathability
    const span = Math.max(100, pnlHighest - pnlLowest);
    const paddedMin = pnlLowest - span * 0.15;
    const paddedMax = pnlHighest + span * 0.15;

    // SVG coordinate space
    const width = 900;
    const height = 400;
    const padding = { top: 25, bottom: 40, left: 65, right: 25 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const sToX = (s: number) => {
      const ratio = (s - minS) / (maxS - minS || 1);
      return padding.left + ratio * plotWidth;
    };

    const pToY = (pnl: number) => {
      const ratio = (pnl - paddedMin) / (paddedMax - paddedMin || 1);
      // Invert Y for SVG coordinates
      return padding.top + (1 - ratio) * plotHeight;
    };

    const zY = pToY(0);

    return {
      minSpot: minS,
      maxSpot: maxS,
      minPnL: paddedMin,
      maxPnL: paddedMax,
      zeroY: zY,
      spotToX: sToX,
      pnlToY: pToY
    };
  }, [points, showExpiryCurve, showTargetCurve, showCurrentCurve]);

  // Construct SVG paths
  const { expiryPath, targetPath, currentPath, profitShadingPath, lossShadingPath } = useMemo(() => {
    if (points.length === 0) {
      return { expiryPath: '', targetPath: '', currentPath: '', profitShadingPath: '', lossShadingPath: '' };
    }

    const expD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${spotToX(p.spot).toFixed(1)} ${pnlToY(p.expiryPnL).toFixed(1)}`).join(' ');
    const tgtD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${spotToX(p.spot).toFixed(1)} ${pnlToY(p.targetPnL).toFixed(1)}`).join(' ');
    const curD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${spotToX(p.spot).toFixed(1)} ${pnlToY(p.currentPnL).toFixed(1)}`).join(' ');

    // Shading using target curve if enabled, else expiry curve
    const activeCurve = showTargetCurve ? points.map(p => ({ spot: p.spot, pnl: p.targetPnL })) : points.map(p => ({ spot: p.spot, pnl: p.expiryPnL }));
    
    // Profit polygon (clipped at Y = zeroY)
    const firstX = spotToX(points[0].spot);
    const lastX = spotToX(points[points.length - 1].spot);

    const profitPoints = activeCurve.map(p => {
      const x = spotToX(p.spot);
      const y = Math.min(zeroY, pnlToY(p.pnl));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const profitD = `M ${firstX.toFixed(1)},${zeroY.toFixed(1)} L ${profitPoints} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} Z`;

    // Loss polygon (clipped at Y = zeroY)
    const lossPoints = activeCurve.map(p => {
      const x = spotToX(p.spot);
      const y = Math.max(zeroY, pnlToY(p.pnl));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const lossD = `M ${firstX.toFixed(1)},${zeroY.toFixed(1)} L ${lossPoints} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} Z`;

    return {
      expiryPath: expD,
      targetPath: tgtD,
      currentPath: curD,
      profitShadingPath: profitD,
      lossShadingPath: lossD
    };
  }, [points, spotToX, pnlToY, zeroY, showTargetCurve]);

  // Handle graph clicks to instantly set Target Spot
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const paddingLeft = (65 / 900) * rect.width;
    const paddingRight = (25 / 900) * rect.width;
    const plotWidth = rect.width - paddingLeft - paddingRight;

    if (clickX >= paddingLeft && clickX <= rect.width - paddingRight) {
      const ratio = (clickX - paddingLeft) / plotWidth;
      const clickedSpot = minSpot + ratio * (maxSpot - minSpot);
      onTargetSpotChange(Math.round(clickedSpot));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const paddingLeft = (65 / 900) * rect.width;
    const paddingRight = (25 / 900) * rect.width;
    const plotWidth = rect.width - paddingLeft - paddingRight;

    const ratio = Math.max(0, Math.min(1, (mouseX - paddingLeft) / plotWidth));
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Hovered Point Info
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  // Active legs strikes
  const activeStrikes = useMemo(() => {
    const list: { strike: number; type: string; action: string }[] = [];
    legs.filter(l => l.enabled).forEach(l => {
      if (!list.some(s => s.strike === l.strike && s.type === l.type)) {
        list.push({ strike: l.strike, type: l.type, action: l.action });
      }
    });
    return list;
  }, [legs]);

  // Format currency
  const fmt = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${environment.currency}${Math.round(val).toLocaleString()}`;
  };

  // 3. Calculate exact Spot Prices on the chart where Target Profit & SL levels will be hit
  const { targetHits, slHits } = useMemo(() => {
    if (points.length < 2) return { targetHits: [], slHits: [] };

    const curveData = points.map(p => ({
      spot: p.spot,
      pnl: showTargetCurve ? p.targetPnL : p.expiryPnL
    }));

    const findHits = (level: number) => {
      const hits: number[] = [];
      for (let i = 0; i < curveData.length - 1; i++) {
        const p1 = curveData[i];
        const p2 = curveData[i + 1];

        if ((p1.pnl <= level && p2.pnl >= level) || (p1.pnl >= level && p2.pnl <= level)) {
          if (p2.pnl !== p1.pnl) {
            const ratio = (level - p1.pnl) / (p2.pnl - p1.pnl);
            const hitSpot = Math.round((p1.spot + ratio * (p2.spot - p1.spot)) * 10) / 10;
            if (!hits.some(h => Math.abs(h - hitSpot) < 5)) {
              hits.push(hitSpot);
            }
          }
        }
      }
      return hits;
    };

    const tHits = targetProfit !== null && !isNaN(targetProfit) ? findHits(targetProfit) : [];
    const sHits = normalizedSL !== null ? findHits(normalizedSL) : [];

    return { targetHits: tHits, slHits: sHits };
  }, [points, targetProfit, normalizedSL, showTargetCurve]);

  // Handle setting price alert for hit spot price
  const handleTriggerAlertForSpot = (spot: number, type: 'TARGET' | 'SL') => {
    if (!onSetPriceAlert) return;
    const isAbove = spot >= environment.spotPrice;
    const condition = isAbove ? 'ABOVE_OR_EQUAL' : 'BELOW_OR_EQUAL';
    const note = type === 'TARGET'
      ? `Target Profit (+${environment.currency}${targetProfit}) Hit Level`
      : `Stop Loss (-${environment.currency}${Math.abs(normalizedSL || 0)}) Hit Level`;

    onSetPriceAlert(spot, condition, note);
    setAlertFeedback(`Price alert set for Spot ₹${spot.toLocaleString()} (${type === 'TARGET' ? 'Target' : 'Stop Loss'})!`);
    setTimeout(() => setAlertFeedback(null), 3500);
  };

  // Handle direct file download of Payoff Chart PNG with mobile & desktop support
  const handleDownloadChartPNG = async () => {
    if (!chartCardRef.current) return;
    setIsCapturing(true);
    setDownloadFeedback(null);
    try {
      const res = await captureAndDownloadPayoffChart(chartCardRef.current, environment.symbol);
      if (res.success && res.filename) {
        setDownloadFeedback({
          type: 'success',
          message: 'Payoff Chart image downloaded successfully to your device!',
          filename: res.filename
        });
        onDownloadFeedback?.(true, res.filename, 'Payoff Chart image downloaded successfully');
      } else {
        setDownloadFeedback({
          type: 'error',
          message: res.error || 'Failed to download chart image. Please check permissions.'
        });
        onDownloadFeedback?.(false, res.filename || '', res.error || 'Download failed');
      }
    } catch (err: any) {
      console.error('Download chart failed:', err);
      setDownloadFeedback({
        type: 'error',
        message: err?.message || 'Download failed. Please check browser permissions.'
      });
      onDownloadFeedback?.(false, '', err?.message || 'Download failed');
    } finally {
      setIsCapturing(false);
      setTimeout(() => {
        setDownloadFeedback(null);
      }, 5000);
    }
  };

  // Handle Share Screenshot via html2canvas
  const handleShareChart = async () => {
    if (!chartCardRef.current) return;
    setIsCapturing(true);
    try {
      const res = await captureAndDownloadPayoffChart(chartCardRef.current, environment.symbol);
      if (res.success && res.dataUrl && res.filename) {
        setDownloadFeedback({
          type: 'success',
          message: 'Chart downloaded & ready for sharing!',
          filename: res.filename
        });
        if (onShareComplete) {
          onShareComplete(res.dataUrl, res.filename);
        }
      }
    } catch (err) {
      console.error('Failed to capture Payoff chart screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div
      ref={chartCardRef}
      id="payoff-chart-export-area"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-colors"
    >
      {/* Download Result Banner if active */}
      {downloadFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
            downloadFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {downloadFeedback.type === 'success' ? (
              <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-bold block truncate">{downloadFeedback.message}</span>
              {downloadFeedback.filename && (
                <span className="font-mono text-[11px] opacity-80 block truncate">
                  Saved as: {downloadFeedback.filename} (Mobile & Desktop ready)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDownloadFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* 3 Distinct Badges: Green for Max Profit, Red for Max Loss, Blue for Breakeven */}
      <PayoffRiskSummaryBar points={points} legs={legs} environment={environment} />

      {/* 1. TARGET PROFIT & STOP LOSS INPUT FIELDS (Directly above the chart) */}
      <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Target size={15} className="text-blue-600" />
            <span>Target Profit & Stop Loss Visualizer</span>
          </div>

          <div className="flex items-center gap-2">
            {alertFeedback && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 size={12} />
                <span>{alertFeedback}</span>
              </span>
            )}
            {(targetProfit !== null || stopLoss !== null) && (
              <button
                type="button"
                onClick={() => {
                  setTargetProfit(null);
                  setStopLoss(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
              >
                Clear Levels
              </button>
            )}
          </div>
        </div>

        {/* Two Input Fields: Target Profit and Stop Loss */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Input 1: Target Profit */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-400">
              <label className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Target Profit ({environment.currency})</span>
              </label>
              <div className="flex items-center gap-1">
                {[2500, 5000, 10000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetProfit(val)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      targetProfit === val
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">
                {environment.currency}
              </span>
              <input
                type="number"
                step="500"
                value={targetProfit ?? ''}
                onChange={(e) => setTargetProfit(e.target.value === '' ? null : parseFloat(e.target.value))}
                placeholder="e.g. 5000"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-2xs"
              />
            </div>
          </div>

          {/* Input 2: Stop Loss */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-400">
              <label className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Stop Loss ({environment.currency})</span>
              </label>
              <div className="flex items-center gap-1">
                {[-1000, -2000, -5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStopLoss(val)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                      stopLoss === val
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-rose-100/80 hover:bg-rose-200 text-rose-800'
                    }`}
                  >
                    {val / 1000}k
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">
                {environment.currency}
              </span>
              <input
                type="number"
                step="500"
                value={stopLoss ?? ''}
                onChange={(e) => setStopLoss(e.target.value === '' ? null : parseFloat(e.target.value))}
                placeholder="e.g. -2000"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* 3. Calculated Spot Prices Callout Banner for Broker Alert Setup */}
        {(targetProfit !== null || normalizedSL !== null) && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {/* Target Hit Spot Info */}
            {targetProfit !== null && !isNaN(targetProfit) && (
              <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowUpRight size={15} className="text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300 block truncate">
                      Target +₹{Math.round(targetProfit).toLocaleString()} Hit Spot:
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      {targetHits.length > 0
                        ? targetHits.map(s => {
                            const diff = s - environment.spotPrice;
                            const pct = ((diff / environment.spotPrice) * 100).toFixed(1);
                            return `₹${s.toLocaleString()} (${diff >= 0 ? `+${pct}%` : `${pct}%`})`;
                          }).join(', ')
                        : 'Not reached in curve'}
                    </span>
                  </div>
                </div>

                {targetHits.length > 0 && onSetPriceAlert && (
                  <button
                    type="button"
                    onClick={() => handleTriggerAlertForSpot(targetHits[0], 'TARGET')}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    title="Set price alert for this target spot level"
                  >
                    <Bell size={10} />
                    <span>Set Alert</span>
                  </button>
                )}
              </div>
            )}

            {/* Stop Loss Hit Spot Info */}
            {normalizedSL !== null && (
              <div className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ArrowDownRight size={15} className="text-rose-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-rose-900 dark:text-rose-300 block truncate">
                      Stop Loss -₹{Math.abs(Math.round(normalizedSL)).toLocaleString()} Hit Spot:
                    </span>
                    <span className="text-[11px] font-mono text-rose-700 dark:text-rose-400">
                      {slHits.length > 0
                        ? slHits.map(s => {
                            const diff = s - environment.spotPrice;
                            const pct = ((diff / environment.spotPrice) * 100).toFixed(1);
                            return `₹${s.toLocaleString()} (${diff >= 0 ? `+${pct}%` : `${pct}%`})`;
                          }).join(', ')
                        : 'Not breached in curve'}
                    </span>
                  </div>
                </div>

                {slHits.length > 0 && onSetPriceAlert && (
                  <button
                    type="button"
                    onClick={() => handleTriggerAlertForSpot(slHits[0], 'SL')}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    title="Set price alert for this stop loss spot level"
                  >
                    <Bell size={10} />
                    <span>Set Alert</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Top Controls & Legends */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Left: Legend & Curve Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTargetCurve(!showTargetCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              showTargetCurve
                ? 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Toggle Target Date theoretical curve"
          >
            <div className="w-3.5 h-0.5 bg-cyan-500 dark:bg-cyan-400 rounded-full" />
            <span className="font-medium whitespace-nowrap">Target Date ({whatIf.targetDate.slice(5)})</span>
            {showTargetCurve ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button
            onClick={() => setShowExpiryCurve(!showExpiryCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              showExpiryCurve
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Toggle At-Expiry intrinsic curve"
          >
            <div className="w-3.5 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
            <span className="font-medium whitespace-nowrap">At Expiry</span>
            {showExpiryCurve ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button
            onClick={() => setShowCurrentCurve(!showCurrentCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              showCurrentCurve
                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Toggle Today (T+0) curve"
          >
            <div className="w-3.5 h-0.5 border-t border-dashed border-amber-500 dark:border-amber-400" />
            <span className="font-medium whitespace-nowrap">T+0 Today</span>
            {showCurrentCurve ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>

        {/* Right: Actions (Save Strategy, Share on WhatsApp) & Zoom */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Save Strategy Button */}
          {onSaveStrategy && (
            <button
              type="button"
              onClick={onSaveStrategy}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Save current strategy trades array to LocalStorage"
            >
              <Bookmark size={13} className="text-blue-600" />
              <span>Save Strategy</span>
            </button>
          )}

          {/* 1. Explicit Download Chart Image Button (Mobile & Desktop) */}
          <button
            type="button"
            onClick={handleDownloadChartPNG}
            disabled={isCapturing}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Download Payoff Chart PNG image file directly to your device"
          >
            {isCapturing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download</span>
              </>
            )}
          </button>

          {/* 2. Share Button: screenshot payoff chart and download for WhatsApp */}
          <button
            type="button"
            onClick={handleShareChart}
            disabled={isCapturing}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Screenshot Payoff chart and download image to share on WhatsApp"
          >
            {isCapturing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Capturing...</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Share</span>
              </>
            )}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="px-2 text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
              <ZoomIn size={11} /> Zoom:
            </span>
            {[0.10, 0.15, 0.25, 0.40].map(val => (
              <button
                key={val}
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
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[21/9] min-h-[340px] max-h-[460px] cursor-crosshair select-none"
      >
        <svg
          viewBox="0 0 900 400"
          className="w-full h-full overflow-visible"
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Shading linear gradients */}
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
            </linearGradient>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#06b6d4" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines (horizontal Y ticks) */}
          {[-0.6, -0.3, 0.3, 0.6].map(ratio => {
            const yVal = zeroY + (ratio * (400 - 65));
            if (yVal < 25 || yVal > 360) return null;
            return (
              <line
                key={ratio}
                x1="65"
                y1={yVal}
                x2="875"
                y2={yVal}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Shading zones */}
          {profitShadingPath && (
            <path d={profitShadingPath} fill="url(#profitGrad)" />
          )}
          {lossShadingPath && (
            <path d={lossShadingPath} fill="url(#lossGrad)" />
          )}

          {/* Zero P&L Axis */}
          <line
            x1="65"
            y1={zeroY}
            x2="875"
            y2={zeroY}
            stroke={isDark ? '#475569' : '#94a3b8'}
            strokeWidth="1.5"
          />
          <text
            x="58"
            y={zeroY + 3.5}
            fill={isDark ? '#94a3b8' : '#64748b'}
            fontSize="10"
            textAnchor="end"
            fontFamily="JetBrains Mono"
          >
            0
          </text>

          {/* Strike price markers along bottom */}
          {activeStrikes.map((s, idx) => {
            const x = spotToX(s.strike);
            if (x < 65 || x > 875) return null;
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1="25"
                  x2={x}
                  y2="360"
                  stroke={isDark ? '#334155' : '#cbd5e1'}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <circle cx={x} cy={zeroY} r="2.5" fill={isDark ? '#64748b' : '#94a3b8'} />
                <text
                  x={x}
                  y="375"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                >
                  {s.strike}
                </text>
              </g>
            );
          })}

          {/* Break-even pin markers */}
          {breakevens.map((be, idx) => {
            const x = spotToX(be);
            if (x < 65 || x > 875) return null;
            return (
              <g key={`be-${idx}`}>
                <circle cx={x} cy={zeroY} r="5" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx={x} cy={zeroY} r="2" fill="#f59e0b" />
                <rect
                  x={x - 28}
                  y={zeroY - 20}
                  width="56"
                  height="14"
                  rx="3"
                  fill={isDark ? '#1e293b' : '#fffbeb'}
                  stroke="#d97706"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={zeroY - 10}
                  fill={isDark ? '#fbbf24' : '#b45309'}
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  BE {be}
                </text>
              </g>
            );
          })}

          {/* Current Spot Vertical Line */}
          {(() => {
            const x = spotToX(environment.spotPrice);
            if (x < 65 || x > 875) return null;
            return (
              <g>
                <line
                  x1={x}
                  y1="25"
                  x2={x}
                  y2="360"
                  stroke={isDark ? '#e2e8f0' : '#475569'}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <rect
                  x={x - 36}
                  y="12"
                  width="72"
                  height="16"
                  rx="3"
                  fill={isDark ? '#0f172a' : '#f8fafc'}
                  stroke={isDark ? '#cbd5e1' : '#64748b'}
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y="23.5"
                  fill={isDark ? '#f1f5f9' : '#0f172a'}
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

          {/* Target Spot Vertical Line & Draggable Handle */}
          {(() => {
            const x = spotToX(whatIf.targetSpot);
            if (x < 65 || x > 875) return null;
            return (
              <g>
                <line
                  x1={x}
                  y1="25"
                  x2={x}
                  y2="360"
                  stroke={isDark ? '#06b6d4' : '#0284c7'}
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <rect
                  x={x - 42}
                  y="34"
                  width="84"
                  height="18"
                  rx="4"
                  fill={isDark ? '#083344' : '#ecfeff'}
                  stroke={isDark ? '#06b6d4' : '#0284c7'}
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y="46"
                  fill={isDark ? '#67e8f9' : '#0e7490'}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  Target {whatIf.targetSpot}
                </text>
              </g>
            );
          })()}

          {/* Payoff Curves */}
          {showCurrentCurve && currentPath && (
            <path
              d={currentPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {showExpiryCurve && expiryPath && (
            <path
              d={expiryPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
            />
          )}

          {showTargetCurve && targetPath && (
            <path
              d={targetPath}
              fill="none"
              stroke={isDark ? '#22d3ee' : '#0284c7'}
              strokeWidth="2.5"
              filter={isDark ? "url(#cyanGlow)" : undefined}
            />
          )}

          {/* 1. Target Profit Horizontal Green Dashed Line */}
          {targetProfit !== null && !isNaN(targetProfit) && (() => {
            const y = pnlToY(targetProfit);
            if (y < 20 || y > 365) return null;
            return (
              <g key="target-profit-line">
                <line
                  x1="65"
                  y1={y}
                  x2="875"
                  y2={y}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <rect
                  x="765"
                  y={y - 10}
                  width="110"
                  height="20"
                  rx="4"
                  fill="#10b981"
                  className="shadow-sm"
                />
                <text
                  x="820"
                  y={y + 3.5}
                  fill="#ffffff"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  🎯 Target +₹{Math.round(targetProfit).toLocaleString()}
                </text>
              </g>
            );
          })()}

          {/* 2. Stop Loss Horizontal Red Dashed Line */}
          {normalizedSL !== null && (() => {
            const y = pnlToY(normalizedSL);
            if (y < 20 || y > 365) return null;
            return (
              <g key="stop-loss-line">
                <line
                  x1="65"
                  y1={y}
                  x2="875"
                  y2={y}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <rect
                  x="765"
                  y={y - 10}
                  width="110"
                  height="20"
                  rx="4"
                  fill="#ef4444"
                  className="shadow-sm"
                />
                <text
                  x="820"
                  y={y + 3.5}
                  fill="#ffffff"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  🛑 SL -₹{Math.abs(Math.round(normalizedSL)).toLocaleString()}
                </text>
              </g>
            );
          })()}

          {/* 3. Target Hit Intersection Markers & Drop Lines */}
          {targetProfit !== null && !isNaN(targetProfit) && targetHits.map((spot, idx) => {
            const x = spotToX(spot);
            const y = pnlToY(targetProfit);
            if (x < 65 || x > 875) return null;
            return (
              <g key={`target-hit-${idx}`}>
                <line
                  x1={x}
                  y1={Math.min(y, 355)}
                  x2={x}
                  y2="360"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="5.5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#ffffff"
                />
                <rect
                  x={x - 42}
                  y={y - 24 > 25 ? y - 24 : y + 8}
                  width="84"
                  height="16"
                  rx="3"
                  fill="#ecfdf5"
                  stroke="#059669"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 24 > 25 ? y - 13 : y + 19}
                  fill="#065f46"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  Target @ ₹{spot}
                </text>
                <rect
                  x={x - 30}
                  y="360"
                  width="60"
                  height="15"
                  rx="3"
                  fill="#10b981"
                />
                <text
                  x={x}
                  y="371"
                  fill="#ffffff"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  🎯 {spot}
                </text>
              </g>
            );
          })}

          {/* 4. Stop Loss Hit Intersection Markers & Drop Lines */}
          {normalizedSL !== null && slHits.map((spot, idx) => {
            const x = spotToX(spot);
            const y = pnlToY(normalizedSL);
            if (x < 65 || x > 875) return null;
            return (
              <g key={`sl-hit-${idx}`}>
                <line
                  x1={x}
                  y1={Math.min(y, 355)}
                  x2={x}
                  y2="360"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="5.5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#ffffff"
                />
                <rect
                  x={x - 42}
                  y={y - 24 > 25 ? y - 24 : y + 8}
                  width="84"
                  height="16"
                  rx="3"
                  fill="#fff1f2"
                  stroke="#e11d48"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 24 > 25 ? y - 13 : y + 19}
                  fill="#9f1239"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  SL @ ₹{spot}
                </text>
                <rect
                  x={x - 30}
                  y="377"
                  width="60"
                  height="15"
                  rx="3"
                  fill="#ef4444"
                />
                <text
                  x={x}
                  y="388"
                  fill="#ffffff"
                  fontSize="8.5"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  🛑 {spot}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Crosshair */}
          {hoveredPoint && (
            <g>
              {(() => {
                const x = spotToX(hoveredPoint.spot);
                const y = pnlToY(showTargetCurve ? hoveredPoint.targetPnL : hoveredPoint.expiryPnL);
                return (
                  <>
                    <line
                      x1={x}
                      y1="25"
                      x2={x}
                      y2="360"
                      stroke={isDark ? '#94a3b8' : '#64748b'}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={isDark ? '#22d3ee' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* Y-Axis scale labels */}
          <text x="58" y="32" fill={isDark ? '#64748b' : '#94a3b8'} fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
            {fmt(maxPnL)}
          </text>
          <text x="58" y="355" fill={isDark ? '#64748b' : '#94a3b8'} fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
            {fmt(minPnL)}
          </text>
        </svg>

        {/* Floating Crosshair HUD Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-2 pointer-events-none bg-white/95 dark:bg-slate-950/95 border border-slate-300 dark:border-cyan-800/80 shadow-2xl rounded-lg p-2.5 text-xs z-30 transition-all font-mono text-slate-800 dark:text-slate-200"
            style={{
              left: `${Math.min(75, Math.max(10, ((spotToX(hoveredPoint.spot) / 900) * 100)))}%`
            }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5 font-semibold text-slate-900 dark:text-slate-200">
              <span>Spot: {hoveredPoint.spot}</span>
              <span className={hoveredPoint.spot >= environment.spotPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {(((hoveredPoint.spot - environment.spotPrice) / environment.spotPrice) * 100).toFixed(1)}%
              </span>
            </div>

            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between items-center gap-4 text-cyan-700 dark:text-cyan-300">
                <span>Target Date P&L:</span>
                <span className={`font-bold ${hoveredPoint.targetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmt(hoveredPoint.targetPnL)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 text-indigo-700 dark:text-indigo-300">
                <span>At Expiry P&L:</span>
                <span className={`font-bold ${hoveredPoint.expiryPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmt(hoveredPoint.expiryPnL)}
                </span>
              </div>
              {showCurrentCurve && (
                <div className="flex justify-between items-center gap-4 text-amber-700 dark:text-amber-300">
                  <span>T+0 Today P&L:</span>
                  <span className={`font-bold ${hoveredPoint.currentPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {fmt(hoveredPoint.currentPnL)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Axis Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono px-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
        <span>Min Range: {minSpot}</span>
        <span className="text-slate-700 dark:text-slate-300 font-medium">Underlying Spot Price ({environment.currency})</span>
        <span>Max Range: {maxSpot}</span>
      </div>
    </div>
  );
};
