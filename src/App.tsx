import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MarketEnvironment,
  OptionLeg,
  WhatIfParameters,
  SavedStrategy,
  PriceAlert,
  AlertCondition,
  ManualPnLEntry
} from './types/options';
import { evaluatePosition } from './utils/blackScholes';
import { StrategyTemplate } from './data/strategyTemplates';
import { playAlertChime } from './utils/audioAlert';
import { ParsedTradeResult } from './utils/screenshotParser';

// Components
import { TradeLabHeader, MainNavTab } from './components/TradeLabHeader';
import { EditorView } from './components/EditorView';
import { OptionChainView } from './components/OptionChainView';
import { SubTabType } from './components/ReadyMadeStrategiesSection';
import { PayoffChart } from './components/PayoffChart';
import { PositionMetricsCards } from './components/PositionMetricsCards';
import { EstimatedMarginCard } from './components/EstimatedMarginCard';
import { ProbabilityOfProfitCard } from './components/ProbabilityOfProfitCard';
import { EstimatedChargesNetPnLCard } from './components/EstimatedChargesNetPnLCard';
import { PnLView } from './components/PnLView';
import { GreeksOverview } from './components/GreeksOverview';
import { GreeksMatrixView } from './components/GreeksMatrixView';
import { WhatIfEnginePanel } from './components/WhatIfEnginePanel';
import { ScenarioAnalysisPanel } from './components/ScenarioAnalysisPanel';
import { SavedSetupsView } from './components/SavedSetupsView';
import { SavedStrategiesModal } from './components/SavedStrategiesModal';
import { SaveStrategyPromptModal } from './components/SaveStrategyPromptModal';
import { SharePayoffModal } from './components/SharePayoffModal';
import { PriceAlertOverlay } from './components/PriceAlertOverlay';
import { ToastNotification } from './components/ToastNotification';
import { BottomNavBar, BottomNavDestination } from './components/BottomNavBar';
import { SettingsModal } from './components/SettingsModal';
import { ManualPnLModal } from './components/ManualPnLModal';
import { AIAssistantChat } from './components/AIAssistantChat';
import { DownloadToast, DownloadNotification } from './components/DownloadToast';

const STORAGE_KEY = 'tradelab_saved_strategies_v2';
const ALERTS_STORAGE_KEY = 'tradelab_price_alerts_v2';

export default function App() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Market Environment State (Defaults to NIFTY 25030.35 +2.01% as specified)
  const [environment, setEnvironment] = useState<MarketEnvironment>({
    symbol: 'NIFTY',
    spotPrice: 25030.35,
    changePercent: 2.01,
    globalIV: 13.8,
    interestRate: 6.5,
    currency: '₹',
    baseDate: todayStr
  });

  // 2. What-If Stress Parameters State
  const [whatIf, setWhatIf] = useState<WhatIfParameters>({
    targetDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    targetSpot: 25030.35,
    targetIVShift: 0
  });

  // 3. Option Legs State (Starts empty as specified to showcase the exact "No Trades Added" empty state)
  const [legs, setLegs] = useState<OptionLeg[]>([]);

  // 4. Manual P&L State
  const [manualPnL, setManualPnL] = useState<ManualPnLEntry>({
    enabled: false,
    amount: 0,
    description: ''
  });

  // 5. Navigation States
  const [activeTab, setActiveTab] = useState<MainNavTab>('editor');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('ready-made'); // Active with blue underline as specified
  const [activeBottomNav, setActiveBottomNav] = useState<BottomNavDestination>('home');

  // 6. Modal Visibility States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'market' | 'apk'>('market');
  const [isManualPnLModalOpen, setIsManualPnLModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    dataUrl?: string;
    filename?: string;
  }>({ isOpen: false });
  const [isAlertsOverlayOpen, setIsAlertsOverlayOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [downloadNotification, setDownloadNotification] = useState<DownloadNotification | null>(null);

  const handleDownloadFeedback = (success: boolean, filename: string, message: string) => {
    setDownloadNotification({
      id: `dl-${Date.now()}`,
      type: success ? 'success' : 'error',
      title: success ? 'Download Successful' : 'Download Failed',
      filename,
      message
    });
  };

  // 7. Saved Strategies State with LocalStorage
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load strategies', e);
    }
    return [];
  });

  // 8. Price Alerts State with LocalStorage
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load alerts', e);
    }
    return [
      {
        id: 'seed-alert-1',
        symbol: 'NIFTY',
        targetPrice: 25200,
        condition: 'ABOVE_OR_EQUAL',
        note: 'Breakout resistance level',
        isActive: true,
        triggered: false,
        createdAt: Date.now() - 3600000
      },
      {
        id: 'seed-alert-2',
        symbol: 'NIFTY',
        targetPrice: 24800,
        condition: 'BELOW_OR_EQUAL',
        note: 'Key support level',
        isActive: true,
        triggered: false,
        createdAt: Date.now() - 7200000
      }
    ];
  });

  // Sync saved strategies to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStrategies));
    } catch (e) {
      console.error('Failed to save strategies', e);
    }
  }, [savedStrategies]);

  // Sync alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save alerts', e);
    }
  }, [alerts]);

  // Evaluate price alerts whenever spotPrice changes
  useEffect(() => {
    let triggeredAnyNew = false;
    const currentSpot = environment.spotPrice;

    setAlerts(prevAlerts => {
      let changed = false;
      const updated = prevAlerts.map(alert => {
        if (alert.symbol !== environment.symbol || !alert.isActive) return alert;

        let isMatch = false;
        if (alert.condition === 'ABOVE_OR_EQUAL') isMatch = currentSpot >= alert.targetPrice;
        else if (alert.condition === 'BELOW_OR_EQUAL') isMatch = currentSpot <= alert.targetPrice;
        else if (alert.condition === 'EXACT') isMatch = Math.abs(currentSpot - alert.targetPrice) <= Math.max(1, alert.targetPrice * 0.001);

        if (isMatch && !alert.triggered) {
          triggeredAnyNew = true;
          changed = true;
          return { ...alert, triggered: true, triggeredAt: Date.now() };
        }
        return alert;
      });

      return changed ? updated : prevAlerts;
    });

    if (triggeredAnyNew && soundEnabled) {
      playAlertChime();
    }
  }, [environment.spotPrice, environment.symbol, soundEnabled]);

  // Evaluate quantitative metrics via Black-Scholes-Merton Engine
  const { valuations, metrics } = useMemo(() => {
    const res = evaluatePosition(legs, environment, whatIf);
    // Incorporate manual P&L adjustment if enabled
    if (manualPnL.enabled && manualPnL.amount !== 0) {
      return {
        ...res,
        metrics: {
          ...res.metrics,
          totalTargetPnL: res.metrics.totalTargetPnL + manualPnL.amount,
          totalExpiryPnL: res.metrics.totalExpiryPnL + manualPnL.amount
        }
      };
    }
    return res;
  }, [legs, environment, whatIf, manualPnL]);

  // Handle Strategy Template Selection from Ready-Made Grid
  const handleSelectStrategy = (template: StrategyTemplate, customExpiry: string) => {
    const newLegs = template.createLegs(environment, customExpiry);
    setLegs(newLegs);

    if (newLegs.length > 0) {
      setWhatIf(prev => ({
        ...prev,
        targetSpot: environment.spotPrice,
        targetDate: newLegs[0].expiry
      }));
    }
  };

  // Handle Trades Parsed from Screenshot Upload
  const handleParsedTrades = useCallback((result: ParsedTradeResult) => {
    setLegs(result.legs);
    if (result.detectedSymbol || result.detectedSpotPrice) {
      setEnvironment(prev => ({
        ...prev,
        symbol: result.detectedSymbol || prev.symbol,
        spotPrice: result.detectedSpotPrice || prev.spotPrice,
        changePercent: result.detectedSymbol === 'BANKNIFTY' ? 1.45 : prev.changePercent
      }));
      setWhatIf(prev => ({
        ...prev,
        targetSpot: result.detectedSpotPrice || prev.targetSpot,
        targetDate: result.legs[0]?.expiry || prev.targetDate
      }));
    }
  }, []);

  // Handle Multi-Expiry Calendar Spread Auto-Build
  const handleAutoBuildCalendar = useCallback((newLegs: OptionLeg[]) => {
    setLegs(newLegs);
    if (newLegs.length > 0) {
      setWhatIf(prev => ({
        ...prev,
        targetSpot: environment.spotPrice,
        targetDate: newLegs[0].expiry
      }));
    }
  }, [environment.spotPrice]);

  // Handle Adding Trade from Option Chain
  const handleAddOptionChainLeg = useCallback((newLeg: OptionLeg) => {
    setLegs(prev => [...prev, newLeg]);
  }, []);

  // Lock All Active Legs at Target BSM Theoretical Values
  const handleLockAtTarget = () => {
    const updatedLegs = legs.map(leg => {
      const val = valuations.find(v => v.legId === leg.id);
      if (val && leg.enabled) {
        return {
          ...leg,
          entryPrice: Math.max(0.05, Math.round(val.targetValue * 20) / 20)
        };
      }
      return leg;
    });

    setLegs(updatedLegs);
    setEnvironment(prev => ({
      ...prev,
      spotPrice: whatIf.targetSpot,
      baseDate: whatIf.targetDate,
      globalIV: Math.max(1, prev.globalIV + whatIf.targetIVShift)
    }));
    setWhatIf(prev => ({ ...prev, targetIVShift: 0 }));
  };

  // Price Alert Handlers
  const handleAddAlert = (targetPrice: number, condition: AlertCondition, note: string) => {
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol: environment.symbol,
      targetPrice,
      condition,
      note,
      isActive: true,
      triggered: false,
      createdAt: Date.now()
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleResetAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false, triggeredAt: undefined } : a));
  };

  const handleDismissToast = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false } : a));
  };

  // Bottom Navigation Routing
  const handleBottomNavigate = (dest: BottomNavDestination) => {
    setActiveBottomNav(dest);
    if (dest === 'home') {
      setActiveTab('editor');
    } else if (dest === 'analyse') {
      setActiveTab('payoff');
    } else if (dest === 'positions') {
      setActiveTab('editor');
    } else if (dest === 'watchlist') {
      setIsAlertsOverlayOpen(true);
    }
  };

  // Save Strategy Handler
  const handleSaveCurrent = (name: string, description: string) => {
    const newSaved: SavedStrategy = {
      id: `strat-${Date.now()}`,
      name,
      description,
      savedAt: Date.now(),
      environment: { ...environment },
      legs: JSON.parse(JSON.stringify(legs))
    };
    setSavedStrategies(prev => [newSaved, ...prev]);
  };

  const handleLoadStrategy = (strategy: SavedStrategy) => {
    setEnvironment(strategy.environment);
    setLegs(strategy.legs);
    setActiveTab('editor');
  };

  const handleDeleteStrategy = (id: string) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-24">
      {/* 1. TOP HEADER & NAVIGATION (NIFTY 25030.35 +2.01%, Settings Gear, Tabs with Blue Underline) */}
      <TradeLabHeader
        environment={environment}
        onChangeEnvironment={setEnvironment}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'editor') setActiveBottomNav('home');
          else if (tab === 'payoff') setActiveBottomNav('analyse');
        }}
        onOpenSettings={() => {
          setSettingsModalTab('market');
          setIsSettingsModalOpen(true);
        }}
        onOpenApkDownload={() => {
          setSettingsModalTab('apk');
          setIsSettingsModalOpen(true);
        }}
        tradeCount={legs.length}
        onSaveStrategy={() => setIsSavePromptOpen(true)}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 flex flex-col gap-5">
        {/* TAB 1: EDITOR (Primary Mobile / Desktop Options TradeLab View) */}
        {activeTab === 'editor' && (
          <EditorView
            legs={legs}
            onChangeLegs={setLegs}
            environment={environment}
            valuations={valuations}
            metrics={metrics}
            manualPnL={manualPnL}
            onChangeManualPnL={setManualPnL}
            onOpenManualPnLModal={() => setIsManualPnLModalOpen(true)}
            onSelectStrategy={handleSelectStrategy}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
            savedCount={savedStrategies.length}
            draftCount={0}
            onSwitchToPayoff={() => {
              setActiveTab('payoff');
              setActiveBottomNav('analyse');
            }}
            onParsedTradesFromScreenshot={handleParsedTrades}
            onAutoBuildCalendar={handleAutoBuildCalendar}
            savedStrategies={savedStrategies}
            onLoadStrategy={handleLoadStrategy}
            onDeleteStrategy={handleDeleteStrategy}
            onOpenSavePrompt={() => setIsSavePromptOpen(true)}
            whatIf={whatIf}
          />
        )}

        {/* TAB: OPTION CHAIN */}
        {activeTab === 'option-chain' && (
          <OptionChainView
            environment={environment}
            onAddLeg={handleAddOptionChainLeg}
            onSwitchToEditor={() => {
              setActiveTab('editor');
              setActiveBottomNav('home');
            }}
            currentLegsCount={legs.length}
          />
        )}

        {/* TAB 2: SUMMARY (Key Position Metrics & Risk Breakdown) */}
        {activeTab === 'summary' && (
          <div className="flex flex-col gap-5">
            <PositionMetricsCards metrics={metrics} environment={environment} />

            {/* Executive Risk/Reward Duo: Estimated Margin & Probability of Profit (POP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EstimatedMarginCard legs={legs} environment={environment} />
              <ProbabilityOfProfitCard
                pop={metrics.probabilityOfProfit}
                breakevens={metrics.breakevens}
                environment={environment}
                legs={legs}
              />
            </div>

            {/* Estimated Charges & Net P&L Card (Indian Brokerage & Taxes Calculator) */}
            <EstimatedChargesNetPnLCard
              legs={legs}
              environment={environment}
              metrics={metrics}
            />

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Executive Strategy Risk Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 block">Underlying Asset</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {environment.symbol} @ ₹{environment.spotPrice.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 block">Implied Volatility</span>
                  <span className="text-sm font-bold text-amber-600 font-mono">
                    {environment.globalIV}% (ATM IV)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 block">Break-even Spot(s)</span>
                  <span className="text-sm font-bold text-blue-600 font-mono">
                    {metrics.breakevens.length > 0 ? metrics.breakevens.join(', ') : 'None'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 block">Probability of Profit</span>
                  <span className="text-sm font-bold text-emerald-600 font-mono">
                    {metrics.probabilityOfProfit}%
                  </span>
                </div>
              </div>
            </div>

            <GreeksOverview
              metrics={metrics}
              environment={environment}
              legs={legs}
              valuations={valuations}
            />
          </div>
        )}

        {/* TAB 3: PAYOFF (Interactive Dynamic Payoff Curve & Zoom) */}
        {activeTab === 'payoff' && (
          <div className="flex flex-col gap-5">
            <PositionMetricsCards metrics={metrics} environment={environment} />

            {/* 1. Highlighted Card: Estimated Margin Required (Above Payoff Chart) */}
            <EstimatedMarginCard legs={legs} environment={environment} />

            <PayoffChart
              legs={legs}
              environment={environment}
              whatIf={whatIf}
              onTargetSpotChange={(spot) => setWhatIf(prev => ({ ...prev, targetSpot: spot }))}
              breakevens={metrics.breakevens}
              theme="light"
              onSaveStrategy={() => setIsSavePromptOpen(true)}
              onShareComplete={(dataUrl, filename) =>
                setShareModalData({ isOpen: true, dataUrl, filename })
              }
              onSetPriceAlert={handleAddAlert}
              onDownloadFeedback={handleDownloadFeedback}
            />

            {/* Scenario Analysis (Stress Testing) Panel directly below Payoff Chart */}
            <ScenarioAnalysisPanel
              environment={environment}
              legs={legs}
              whatIf={whatIf}
              onApplyToWhatIf={(targetSpot, targetIVShift) => {
                setWhatIf(prev => ({ ...prev, targetSpot, targetIVShift }));
              }}
            />

            <WhatIfEnginePanel
              whatIf={whatIf}
              onChangeWhatIf={setWhatIf}
              environment={environment}
              legs={legs}
              metrics={metrics}
              valuations={valuations}
              onLockAtTarget={handleLockAtTarget}
            />
          </div>
        )}

        {/* TAB 4: P&L (Multi-Scenario Sensitivity Matrix) */}
        {activeTab === 'pnl' && (
          <PnLView
            legs={legs}
            environment={environment}
            whatIf={whatIf}
            valuations={valuations}
            metrics={metrics}
          />
        )}

        {/* TAB 5: GREEKS (Greeks Decomposition & Sensitivity Matrix) */}
        {activeTab === 'greeks' && (
          <div className="flex flex-col gap-5">
            <GreeksOverview
              metrics={metrics}
              environment={environment}
              legs={legs}
              valuations={valuations}
            />

            <GreeksMatrixView
              legs={legs}
              environment={environment}
              whatIf={whatIf}
              valuations={valuations}
              metrics={metrics}
            />
          </div>
        )}

        {/* TAB 6: STRATEGY (What-If Simulation, Locking & Saved Setups) */}
        {activeTab === 'strategy' && (
          <div className="flex flex-col gap-5">
            <WhatIfEnginePanel
              whatIf={whatIf}
              onChangeWhatIf={setWhatIf}
              environment={environment}
              legs={legs}
              metrics={metrics}
              valuations={valuations}
              onLockAtTarget={handleLockAtTarget}
            />

            <SavedSetupsView
              savedStrategies={savedStrategies}
              currentLegs={legs}
              currentEnv={environment}
              onSaveCurrent={handleSaveCurrent}
              onLoadStrategy={handleLoadStrategy}
              onDeleteStrategy={handleDeleteStrategy}
              onImportStrategies={(imported) => setSavedStrategies(prev => [...imported, ...prev])}
              onSwitchToBuilder={() => setActiveTab('editor')}
            />
          </div>
        )}
      </main>

      {/* 5. BOTTOM NAVIGATION BAR (Fixed at the bottom: Home, Analyse, Positions, Watchlist) */}
      <BottomNavBar
        activeDestination={activeBottomNav}
        onNavigate={handleBottomNavigate}
        positionsBadge={legs.length}
        watchlistBadge={alerts.filter(a => a.isActive).length}
      />

      {/* Modals & Overlays */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        environment={environment}
        onChangeEnvironment={setEnvironment}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        initialTab={settingsModalTab}
        onDownloadNotify={handleDownloadFeedback}
      />

      <ManualPnLModal
        isOpen={isManualPnLModalOpen}
        onClose={() => setIsManualPnLModalOpen(false)}
        manualPnL={manualPnL}
        onSave={setManualPnL}
        currency={environment.currency}
      />

      <PriceAlertOverlay
        isOpen={isAlertsOverlayOpen}
        onClose={() => setIsAlertsOverlayOpen(false)}
        alerts={alerts.filter(a => a.symbol === environment.symbol)}
        environment={environment}
        whatIfTargetSpot={whatIf.targetSpot}
        breakevens={metrics.breakevens}
        onAddAlert={handleAddAlert}
        onToggleAlert={handleToggleAlert}
        onDeleteAlert={handleDeleteAlert}
        onResetAlert={handleResetAlert}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
      />

      <SavedStrategiesModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        savedStrategies={savedStrategies}
        currentLegs={legs}
        currentEnv={environment}
        onSaveCurrent={handleSaveCurrent}
        onLoadStrategy={handleLoadStrategy}
        onDeleteStrategy={handleDeleteStrategy}
        onImportStrategies={(imported) => setSavedStrategies(prev => [...imported, ...prev])}
      />

      {/* 1. Prompt Modal to name & save current strategy to LocalStorage */}
      <SaveStrategyPromptModal
        isOpen={isSavePromptOpen}
        onClose={() => setIsSavePromptOpen(false)}
        legs={legs}
        environment={environment}
        onSave={handleSaveCurrent}
      />

      {/* 3. WhatsApp Payoff Chart Share Modal */}
      <SharePayoffModal
        isOpen={shareModalData.isOpen}
        onClose={() => setShareModalData(prev => ({ ...prev, isOpen: false }))}
        environment={environment}
        legs={legs}
        metrics={metrics}
        filename={shareModalData.filename}
        dataUrl={shareModalData.dataUrl}
      />

      {/* Floating AI Assistant (Bottom Right Corner) */}
      <AIAssistantChat
        environment={environment}
        legs={legs}
        metrics={metrics}
      />

      <ToastNotification
        alerts={alerts.filter(a => a.symbol === environment.symbol)}
        environment={environment}
        onDismiss={handleDismissToast}
        onOpenAlertsOverlay={() => setIsAlertsOverlayOpen(true)}
      />

      {/* Global Download Success/Failure Toast Feedback */}
      <DownloadToast
        notification={downloadNotification}
        onDismiss={() => setDownloadNotification(null)}
      />
    </div>
  );
}
