import React, { useState } from 'react';
import { X, Settings, RefreshCw, Volume2, VolumeX, Smartphone, Download, Sliders } from 'lucide-react';
import { MarketEnvironment } from '../types/options';
import { ApkDownloadSection } from './ApkDownloadSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: MarketEnvironment;
  onChangeEnvironment: (env: MarketEnvironment) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  initialTab?: 'market' | 'apk';
  onDownloadNotify?: (success: boolean, filename: string, message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  environment,
  onChangeEnvironment,
  soundEnabled,
  onToggleSound,
  initialTab = 'market',
  onDownloadNotify
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'market' | 'apk'>(initialTab);
  const [spot, setSpot] = useState<number>(environment.spotPrice);
  const [iv, setIv] = useState<number>(environment.globalIV);
  const [r, setR] = useState<number>(environment.interestRate);

  // Sync state if modal reopens or props change
  React.useEffect(() => {
    if (isOpen) {
      setActiveModalTab(initialTab);
      setSpot(environment.spotPrice);
      setIv(environment.globalIV);
      setR(environment.interestRate);
    }
  }, [isOpen, initialTab, environment.spotPrice, environment.globalIV, environment.interestRate]);

  if (!isOpen) return null;


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeEnvironment({
      ...environment,
      spotPrice: spot,
      globalIV: iv,
      interestRate: r
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setSpot(25030.35);
    setIv(13.8);
    setR(6.5);
    onChangeEnvironment({
      ...environment,
      symbol: 'NIFTY',
      spotPrice: 25030.35,
      changePercent: 2.01,
      globalIV: 13.8,
      interestRate: 6.5,
      currency: '₹'
    });
    onClose();
  };

  const handleResetSpxDefaults = () => {
    setSpot(5860.50);
    setIv(14.5);
    setR(4.8);
    onChangeEnvironment({
      ...environment,
      symbol: 'SPX',
      spotPrice: 5860.50,
      changePercent: 0.75,
      globalIV: 14.5,
      interestRate: 4.8,
      currency: '$'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {activeModalTab === 'apk' ? <Smartphone size={18} /> : <Settings size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeModalTab === 'apk' ? 'Download TradeLab Android APK' : 'TradeLab Settings & Environment'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeModalTab === 'apk'
                  ? 'Install Android APK directly, check version updates, and permissions'
                  : 'Market environment parameters & Black-Scholes pricing engine'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-4 pt-3 pb-2 border-b border-slate-100 bg-white gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab('market')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeModalTab === 'market'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders size={13} />
            <span>Market & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('apk')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeModalTab === 'apk'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Smartphone size={13} />
            <span>Download APK</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeModalTab === 'apk' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              v2.5.0
            </span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="overflow-y-auto p-4 flex-1">
          {activeModalTab === 'apk' ? (
            <ApkDownloadSection onNotify={onDownloadNotify} />
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Spot Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>{environment.symbol} Spot Price ({environment.currency})</span>
                  <span className="text-[11px] font-normal text-slate-400">Underlying price</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={spot}
                  onChange={(e) => setSpot(parseFloat(e.target.value) || 0)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Implied Volatility */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Global Implied Volatility (IV) %</span>
                  <span className="text-[11px] font-normal text-slate-400">Market volatility assumption</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="150"
                    value={iv}
                    onChange={(e) => setIv(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <span className="text-xs font-mono font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Risk-Free Interest Rate (r) %</span>
                  <span className="text-[11px] font-normal text-slate-400">RBI / Sovereign rate (6-7% INR)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={r}
                    onChange={(e) => setR(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <span className="text-xs font-mono font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Alert Audio Chime */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  {soundEnabled ? (
                    <Volume2 size={16} className="text-blue-600" />
                  ) : (
                    <VolumeX size={16} className="text-slate-400" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Price Alert Audio Chime</span>
                    <span className="text-[11px] text-slate-500">Play synthetic tone when spot price hits target</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    soundEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-xs font-medium text-slate-500 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Load Indian NSE NIFTY 50 defaults (₹)"
                  >
                    <RefreshCw size={12} /> NIFTY (₹)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleResetSpxDefaults}
                    className="text-xs font-medium text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Load US S&P 500 Index defaults ($)"
                  >
                    <RefreshCw size={12} /> SPX ($)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
