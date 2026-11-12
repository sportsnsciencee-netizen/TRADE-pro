import React from 'react';
import { Bookmark, Sparkles, SlidersHorizontal, BarChart3, Database, Sun, Moon } from 'lucide-react';

interface TopNavProps {
  activeTab: 'builder' | 'stress' | 'greeks' | 'saved';
  onTabChange: (tab: 'builder' | 'stress' | 'greeks' | 'saved') => void;
  onOpenSaveModal: () => void;
  savedCount: number;
  onOpenAlertsOverlay: () => void;
  activeAlertsCount: number;
  isSpotAlertTriggered: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSaveModal,
  savedCount,
  onOpenAlertsOverlay,
  activeAlertsCount,
  isSpotAlertTriggered,
  theme,
  onToggleTheme
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); onTabChange('builder'); }}
        className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-cyan-500 to-indigo-500 inline-block" />
        OptiQuant Analytics
      </a>

      {/* Zone 2: 4 single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => onTabChange('builder')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'builder' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
          }`}
        >
          <SlidersHorizontal size={14} />
          Portfolio Builder
        </button>

        <button
          onClick={() => onTabChange('stress')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'stress' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
          }`}
        >
          <Sparkles size={14} />
          What-If Engine
        </button>

        <button
          onClick={() => onTabChange('greeks')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'greeks' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
          }`}
        >
          <BarChart3 size={14} />
          Greeks Matrix
        </button>

        <button
          onClick={() => onTabChange('saved')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'saved' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
          }`}
        >
          <Database size={14} />
          Saved Setups
          {savedCount > 0 && (
            <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-transparent">
              {savedCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-cyan-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenAlertsOverlay}
          className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
            isSpotAlertTriggered
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse'
              : activeAlertsCount > 0
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-cyan-700 dark:text-cyan-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Price Alerts Overlay"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSpotAlertTriggered ? 'bg-emerald-500 animate-ping' : activeAlertsCount > 0 ? 'bg-cyan-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
          Price Alerts
          {activeAlertsCount > 0 && (
            <span className="text-[10px] font-mono bg-white dark:bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-200 dark:border-transparent text-cyan-700 dark:text-cyan-300">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSaveModal}
          className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 dark:bg-cyan-400 rounded-lg hover:bg-cyan-300 active:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
        >
          <Bookmark size={13} />
          Save Strategy
        </button>
      </div>
    </header>
  );
};

