import React, { useState } from 'react';
import { Search, Settings, ChevronDown, Check, TrendingUp, Bookmark, Smartphone, Download } from 'lucide-react';
import { MarketEnvironment } from '../types/options';

export type MainNavTab = 'editor' | 'option-chain' | 'summary' | 'payoff' | 'pnl' | 'greeks' | 'strategy';

interface TradeLabHeaderProps {
  environment: MarketEnvironment;
  onChangeEnvironment: (env: MarketEnvironment) => void;
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  onOpenSettings: () => void;
  onOpenApkDownload?: () => void;
  tradeCount: number;
  onSaveStrategy?: () => void;
}

const POPULAR_SYMBOLS = [
  { symbol: 'NIFTY', spot: 25030.35, change: 2.01, lotSize: 50 },
  { symbol: 'BANKNIFTY', spot: 52140.20, change: 1.45, lotSize: 15 },
  { symbol: 'FINNIFTY', spot: 23980.50, change: 1.12, lotSize: 25 },
  { symbol: 'MIDCPNIFTY', spot: 12850.10, change: 0.85, lotSize: 75 },
  { symbol: 'TCS', spot: 4120.00, change: 0.95, lotSize: 175 },
  { symbol: 'RELIANCE', spot: 2980.00, change: 1.60, lotSize: 250 },
  { symbol: 'INFY', spot: 1845.50, change: -0.35, lotSize: 400 }
];

export const TradeLabHeader: React.FC<TradeLabHeaderProps> = ({
  environment,
  onChangeEnvironment,
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenApkDownload,
  tradeCount,
  onSaveStrategy
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const changePct = environment.changePercent ?? 2.01;
  const isPositive = changePct >= 0;

  const filteredSymbols = POPULAR_SYMBOLS.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSymbol = (item: typeof POPULAR_SYMBOLS[0]) => {
    onChangeEnvironment({
      ...environment,
      symbol: item.symbol,
      spotPrice: item.spot,
      changePercent: item.change
    });
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const tabs: { id: MainNavTab; label: string; badge?: number }[] = [
    { id: 'editor', label: 'Editor', badge: tradeCount > 0 ? tradeCount : undefined },
    { id: 'option-chain', label: 'Option Chain' },
    { id: 'summary', label: 'Summary' },
    { id: 'payoff', label: 'Payoff' },
    { id: 'pnl', label: 'P&L' },
    { id: 'greeks', label: 'Greeks' },
    { id: 'strategy', label: 'Strategy' }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* 1. TOP HEADER BAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Search / Ticker Bar */}
        <div className="relative flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setIsSearchOpen(prev => !prev)}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search size={15} className="text-slate-400 shrink-0" />
              <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                <span className="font-bold text-slate-900 text-sm tracking-tight">
                  {environment.symbol}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {environment.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs font-semibold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPositive ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`}
                </span>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {/* Symbol Dropdown Modal */}
          {isSearchOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSearchOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1.5 pb-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search index or stock (e.g. NIFTY, TCS)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredSymbols.map(item => {
                    const isSelected = item.symbol === environment.symbol;
                    const pos = item.change >= 0;
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectSymbol(item)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs hover:bg-slate-50 rounded-lg transition-colors ${
                          isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.symbol}</span>
                          {isSelected && <Check size={13} className="text-blue-600" />}
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span>₹{item.spot.toLocaleString()}</span>
                          <span className={pos ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                            {pos ? `+${item.change}%` : `${item.change}%`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Quick Tagline, Download APK button & Settings Gear Icon */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>NSE Live</span>
          </div>

          {/* Download APK Button */}
          {onOpenApkDownload && (
            <button
              type="button"
              onClick={onOpenApkDownload}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 flex items-center gap-1.5 transition-colors shadow-2xs font-semibold text-xs cursor-pointer"
              title="Download TradeLab Android APK (v2.5.0)"
            >
              <Smartphone size={14} className="text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Download APK</span>
              <span className="sm:hidden font-mono text-[11px]">APK</span>
              <span className="hidden md:inline-block px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-200/70 text-emerald-900">
                v2.5.0
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Options Analytics & Market Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* 2. TOP NAVIGATION TABS (Horizontal Scroll with Blue Underline) */}
      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <nav className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <React.Fragment key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>

                  {/* 1. 'Save Strategy' button next to Payoff tab as requested */}
                  {tab.id === 'payoff' && onSaveStrategy && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveStrategy();
                      }}
                      className="my-auto py-1.5 px-3 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                      title="Save current trades array to LocalStorage under a custom name"
                    >
                      <Bookmark size={13} className="text-blue-600" />
                      <span>Save Strategy</span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
