import React, { useState } from 'react';
import { ChevronDown, Calendar, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { StrategyTemplate, STRATEGY_TEMPLATES } from '../data/strategyTemplates';
import { StrategySparkline } from './StrategySparkline';
import { MarketEnvironment, SavedStrategy, OptionLeg } from '../types/options';
import { SavedStrategiesTabContent } from './SavedStrategiesTabContent';

export type SubTabType = 'editor' | 'ready-made' | 'positions' | 'saved' | 'draft';
export type SentimentFilter = 'Bullish' | 'Bearish' | 'Neutral' | 'Others';

interface ReadyMadeStrategiesSectionProps {
  environment: MarketEnvironment;
  onSelectStrategy: (template: StrategyTemplate, selectedExpiryDate: string) => void;
  activeSubTab: SubTabType;
  onSubTabChange: (tab: SubTabType) => void;
  savedCount: number;
  draftCount: number;
  positionsCount: number;
  onOpenCalendarModal?: (strategyType: 'calendar' | 'double-calendar' | 'triple-calendar') => void;
  savedStrategies?: SavedStrategy[];
  onLoadStrategy?: (strategy: SavedStrategy) => void;
  onDeleteStrategy?: (id: string) => void;
  onOpenSavePrompt?: () => void;
  legs?: OptionLeg[];
}

const EXPIRY_OPTIONS = [
  { label: '09 Nov', value: '2026-11-09' },
  { label: '14 Nov', value: '2026-11-14' },
  { label: '21 Nov', value: '2026-11-21' },
  { label: '28 Nov', value: '2026-11-28' },
  { label: '26 Dec (Monthly)', value: '2026-12-26' }
];

export const ReadyMadeStrategiesSection: React.FC<ReadyMadeStrategiesSectionProps> = ({
  environment,
  onSelectStrategy,
  activeSubTab,
  onSubTabChange,
  savedCount,
  draftCount,
  positionsCount,
  onOpenCalendarModal,
  savedStrategies = [],
  onLoadStrategy,
  onDeleteStrategy,
  onOpenSavePrompt,
  legs = []
}) => {
  const [activeSentiment, setActiveSentiment] = useState<SentimentFilter>('Bullish');
  const [selectedExpiry, setSelectedExpiry] = useState<string>(EXPIRY_OPTIONS[0].label);
  const [isExpiryDropdownOpen, setIsExpiryDropdownOpen] = useState(false);
  const [justLoadedId, setJustLoadedId] = useState<string | null>(null);

  const subTabs: { id: SubTabType; label: string; count?: number }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'ready-made', label: 'Ready-Made' },
    { id: 'positions', label: 'Positions', count: positionsCount },
    { id: 'saved', label: 'Saved', count: savedCount },
    { id: 'draft', label: 'Draft Portfolios', count: draftCount }
  ];

  const sentiments: SentimentFilter[] = ['Bullish', 'Bearish', 'Neutral', 'Others'];

  // Filter templates matching current sentiment (display Calendar Spreads in Neutral and Others)
  const filteredTemplates = STRATEGY_TEMPLATES.filter(
    t => t.displayCategory === activeSentiment || (Boolean(t.isCalendarModal) && (activeSentiment === 'Neutral' || activeSentiment === 'Others'))
  );

  const handleCardClick = (template: StrategyTemplate) => {
    if (template.isCalendarModal && template.calendarType && onOpenCalendarModal) {
      onOpenCalendarModal(template.calendarType);
      return;
    }
    const expiryObj = EXPIRY_OPTIONS.find(e => e.label === selectedExpiry) || EXPIRY_OPTIONS[0];
    onSelectStrategy(template, expiryObj.value);
    setJustLoadedId(template.id);
    setTimeout(() => setJustLoadedId(null), 1500);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* 1. SUB-TABS ROW (Editor, Ready-Made with Blue Underline, Positions, Saved, Draft) */}
      <div className="border-b border-slate-200 px-3 sm:px-4 bg-slate-50/70">
        <div className="flex items-center gap-1 sm:gap-6 overflow-x-auto no-scrollbar">
          {subTabs.map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSubTabChange(tab.id)}
                className={`py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUB-TAB CONTENT SWITCHING */}
      {activeSubTab === 'saved' ? (
        <SavedStrategiesTabContent
          savedStrategies={savedStrategies}
          currentLegs={legs}
          environment={environment}
          onLoadStrategy={(strat) => {
            if (onLoadStrategy) {
              onLoadStrategy(strat);
            }
          }}
          onDeleteStrategy={(id) => {
            if (onDeleteStrategy) {
              onDeleteStrategy(id);
            }
          }}
          onOpenSavePrompt={onOpenSavePrompt}
          onSwitchToReadyMade={() => onSubTabChange('ready-made')}
          onSwitchToEditor={() => onSubTabChange('editor')}
        />
      ) : activeSubTab === 'positions' ? (
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-900">Current Position Legs ({legs.length})</h4>
            <span className="text-xs text-slate-500 font-mono">
              {legs.filter(l => l.enabled).length} Active in Strategy
            </span>
          </div>
          {legs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active position legs. Build a strategy or pick a template below.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {legs.map(l => (
                <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold font-mono ${l.action === 'BUY' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {l.action} {l.strike} {l.type === 'CALL' ? 'CE' : l.type === 'PUT' ? 'PE' : 'FUT'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {l.lots} Lots ({l.lots * l.lotSize} Qty) · Exp: {l.expiry.slice(5)}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    ₹{l.entryPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeSubTab === 'draft' ? (
        <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <p className="font-semibold text-slate-700">No Draft Portfolios</p>
          <p>Uncommitted strategy experiments will appear here.</p>
        </div>
      ) : (
        /* READY-MADE STRATEGIES (Default) */
        <div className="p-3 sm:p-4 flex flex-col gap-3">
          {/* Instruction Line */}
          <p className="text-xs text-slate-500 font-medium">
            Please click on a ready-made strategy to load it
          </p>

          {/* Filter Pills & Expiry Dropdown Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Filter Pills (Bullish [Active/Blue], Bearish, Neutral, Others) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              {sentiments.map(sentiment => {
                const isSelected = activeSentiment === sentiment;
                return (
                  <button
                    key={sentiment}
                    type="button"
                    onClick={() => setActiveSentiment(sentiment)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {sentiment}
                  </button>
                );
              })}
            </div>

            {/* Right: Date Dropdown ("09 Nov") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExpiryDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Calendar size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-900">{selectedExpiry}</span>
                <ChevronDown size={13} className="text-slate-500" />
              </button>

              {isExpiryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExpiryDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                      Target Expiry Date
                    </span>
                    {EXPIRY_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setSelectedExpiry(opt.label);
                          setIsExpiryDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs text-left rounded-md flex items-center justify-between transition-colors ${
                          selectedExpiry === opt.label
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedExpiry === opt.label && <CheckCircle2 size={12} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. STRATEGY CARDS GRID (3 Columns, Rounded-xl, Sparklines) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {filteredTemplates.map(template => {
              const isJustLoaded = justLoadedId === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => handleCardClick(template)}
                  role="button"
                  tabIndex={0}
                  className={`group border rounded-xl p-3.5 bg-white hover:bg-slate-50/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-left relative overflow-hidden ${
                    isJustLoaded
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {/* Left: Sparkline chart with red & green lines */}
                  <div className="w-20 h-10 p-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:border-slate-200 transition-colors">
                    <StrategySparkline type={template.sparklineType} className="w-18 h-9" />
                  </div>

                  {/* Center / Right: Strategy Name + Tag */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {template.name}
                      </h4>

                      {/* Small green tag "Zero Cost" for Range Forward as requested */}
                      {template.isZeroCost && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0">
                          Zero Cost
                        </span>
                      )}

                      {/* Blue tag "Multi-Expiry" for Calendar strategies */}
                      {template.isCalendarModal && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1">
                          <Clock size={10} />
                          <span>Multi-Expiry</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                      {template.description}
                    </p>
                  </div>

                  {/* Just Loaded Confirmation Indicator */}
                  {isJustLoaded && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      <CheckCircle2 size={11} /> Loaded
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
