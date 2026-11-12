import React, { useState } from 'react';
import { MarketEnvironment } from '../types/options';
import { STRATEGY_TEMPLATES, StrategyTemplate } from '../data/strategyTemplates';
import { ChevronDown, RefreshCw, Zap, Bell, BellRing } from 'lucide-react';

interface MarketEnvironmentBarProps {
  environment: MarketEnvironment;
  onChangeEnvironment: (env: MarketEnvironment) => void;
  onApplyTemplate: (template: StrategyTemplate) => void;
  onResetToDefault: () => void;
  onOpenAlertsOverlay: () => void;
  activeAlertsCount: number;
  triggeredAlertsCount: number;
  isSpotAlertTriggered: boolean;
}

const POPULAR_SYMBOLS = [
  { symbol: 'NIFTY 50', defaultSpot: 24250, defaultIV: 14.5, currency: '₹' as const, lotSize: 50 },
  { symbol: 'BANKNIFTY', defaultSpot: 51800, defaultIV: 16.2, currency: '₹' as const, lotSize: 15 },
  { symbol: 'TCS', defaultSpot: 4120, defaultIV: 18.0, currency: '₹' as const, lotSize: 175 },
  { symbol: 'RELIANCE', defaultSpot: 2950, defaultIV: 19.5, currency: '₹' as const, lotSize: 250 },
  { symbol: 'SPY', defaultSpot: 585, defaultIV: 13.8, currency: '$' as const, lotSize: 100 },
  { symbol: 'QQQ', defaultSpot: 505, defaultIV: 17.5, currency: '$' as const, lotSize: 100 },
  { symbol: 'NVDA', defaultSpot: 142, defaultIV: 38.0, currency: '$' as const, lotSize: 100 }
];

export const MarketEnvironmentBar: React.FC<MarketEnvironmentBarProps> = ({
  environment,
  onChangeEnvironment,
  onApplyTemplate,
  onResetToDefault,
  onOpenAlertsOverlay,
  activeAlertsCount,
  triggeredAlertsCount,
  isSpotAlertTriggered
}) => {
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleSymbolChange = (sym: string) => {
    const match = POPULAR_SYMBOLS.find(p => p.symbol === sym);
    if (match) {
      onChangeEnvironment({
        ...environment,
        symbol: match.symbol,
        spotPrice: match.defaultSpot,
        globalIV: match.defaultIV,
        currency: match.currency
      });
    } else {
      onChangeEnvironment({
        ...environment,
        symbol: sym
      });
    }
  };

  const filteredTemplates = selectedCategory === 'All'
    ? STRATEGY_TEMPLATES
    : STRATEGY_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors">
      {/* Left: Market Variables Form */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* Symbol Selector & Manual Input */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Asset / Index</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Symbol</span>
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={POPULAR_SYMBOLS.some(p => p.symbol === environment.symbol) ? environment.symbol : 'CUSTOM'}
              onChange={(e) => {
                if (e.target.value !== 'CUSTOM') {
                  handleSymbolChange(e.target.value);
                }
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-md px-2.5 py-1.5 font-semibold focus:outline-none focus:border-cyan-500"
            >
              {POPULAR_SYMBOLS.map(p => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol} ({p.currency})
                </option>
              ))}
              <option value="CUSTOM">Custom Symbol</option>
            </select>

            <input
              type="text"
              value={environment.symbol}
              onChange={(e) => onChangeEnvironment({ ...environment, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. TCS"
              className="w-24 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-md px-2 py-1.5 font-mono uppercase focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Spot Price Input with Alert Highlight */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
              <span>Spot Price</span>
              <span className="text-slate-400 dark:text-slate-500 font-mono">({environment.currency})</span>
            </label>
            {isSpotAlertTriggered && (
              <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/70 px-1.5 py-0.2 rounded animate-pulse">
                Target Matched!
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              value={environment.spotPrice}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onChangeEnvironment({ ...environment, spotPrice: val });
                }
              }}
              className={`w-28 rounded-md px-2.5 py-1.5 font-mono font-semibold transition-all focus:outline-none ${
                isSpotAlertTriggered
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-4 ring-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                  : 'bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-cyan-700 dark:text-cyan-300 focus:border-cyan-500'
              }`}
            />
            <button
              onClick={() => onChangeEnvironment({ ...environment, spotPrice: Math.round(environment.spotPrice * 0.995 * 10) / 10 })}
              className="px-1.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono"
              title="Down 0.5%"
            >
              -0.5%
            </button>
            <button
              onClick={() => onChangeEnvironment({ ...environment, spotPrice: Math.round(environment.spotPrice * 1.005 * 10) / 10 })}
              className="px-1.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-mono"
              title="Up 0.5%"
            >
              +0.5%
            </button>

            {/* Price Alert Quick Trigger Button */}
            <button
              onClick={onOpenAlertsOverlay}
              className={`p-1.5 rounded-md border transition-all flex items-center gap-1 ml-0.5 ${
                isSpotAlertTriggered
                  ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-500 text-emerald-800 dark:text-emerald-200 animate-bounce'
                  : activeAlertsCount > 0
                  ? 'bg-cyan-50 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Set or view price alerts for this asset"
            >
              {isSpotAlertTriggered ? (
                <BellRing size={14} className="text-emerald-600 dark:text-emerald-300" />
              ) : (
                <Bell size={14} />
              )}
              {activeAlertsCount > 0 && (
                <span className="text-[10px] font-mono font-bold">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Global Implied Volatility (IV) */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <span>Global IV</span>
            <span className="text-slate-400 dark:text-slate-500 font-mono">(%)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.5"
              min="1"
              max="200"
              value={environment.globalIV}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  onChangeEnvironment({ ...environment, globalIV: val });
                }
              }}
              className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-amber-700 dark:text-amber-300 rounded-md px-2.5 py-1.5 font-mono font-semibold focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-1 text-[10px] font-mono">
              {[12, 16, 22].map(v => (
                <button
                  key={v}
                  onClick={() => onChangeEnvironment({ ...environment, globalIV: v })}
                  className={`px-1.5 py-1 rounded border ${
                    environment.globalIV === v
                      ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Risk-Free Interest Rate (r) */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <span>Interest Rate (r)</span>
            <span className="text-slate-400 dark:text-slate-500 font-mono">(%)</span>
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            max="30"
            value={environment.interestRate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onChangeEnvironment({ ...environment, interestRate: val });
              }
            }}
            className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Currency Switcher */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-600 dark:text-slate-400 font-medium">Currency</label>
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onChangeEnvironment({ ...environment, currency: '₹' })}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                environment.currency === '₹' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => onChangeEnvironment({ ...environment, currency: '$' })}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                environment.currency === '$' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Right: Strategy Templates Dropdown & Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900/60 dark:to-purple-900/60 border border-indigo-500/50 dark:border-indigo-700/70 hover:border-indigo-400 dark:hover:border-indigo-500 text-white dark:text-indigo-100 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <Zap size={14} className="text-amber-300 dark:text-amber-400" />
            <span>Load Strategy Template</span>
            <ChevronDown size={14} className={`transition-transform ${showTemplatesMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Template Menu Dropdown */}
          {showTemplatesMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Strategy Templates</span>
                <div className="flex gap-1 text-[10px]">
                  {['All', 'Single', 'Spreads', 'Volatility / Neutral'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        selectedCategory === cat ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onApplyTemplate(template);
                      setShowTemplatesMenu(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors flex flex-col gap-0.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                        {template.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {template.sentiment}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onResetToDefault}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors"
          title="Reset Environment to Initial State"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
};
