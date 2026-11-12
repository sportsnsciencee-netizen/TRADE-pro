import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  Pause,
  Play,
  XCircle,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  APK_DOWNLOAD_URL,
  CURRENT_APP_VERSION,
  LATEST_REMOTE_APK,
  checkApkVersionStatus,
  ApkDownloadManager,
  DownloadProgress,
  triggerAndroidApkInstall,
  ANDROID_8_PERMISSION_STEPS,
  NATIVE_FILEPROVIDER_XML,
  NATIVE_FILEPROVIDER_KOTLIN
} from '../utils/apkDownloader';

interface ApkDownloadSectionProps {
  onNotify?: (success: boolean, filename: string, message: string) => void;
}

export const ApkDownloadSection: React.FC<ApkDownloadSectionProps> = ({ onNotify }) => {
  const [downloadUrl, setDownloadUrl] = useState<string>(APK_DOWNLOAD_URL);
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>(APK_DOWNLOAD_URL);

  // Simulated version toggle to let user easily test "Same Version" vs "Newer Version available"
  const [simulatedRemoteCode, setSimulatedRemoteCode] = useState<number>(LATEST_REMOTE_APK.versionCode);

  const [progress, setProgress] = useState<DownloadProgress>({
    state: 'idle',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: Math.round(LATEST_REMOTE_APK.sizeMB * 1024 * 1024),
    downloadSpeedKBps: 0
  });

  const [installStatusMessage, setInstallStatusMessage] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(true);
  const [showDeveloperGuide, setShowDeveloperGuide] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const managerRef = useRef<ApkDownloadManager | null>(null);

  useEffect(() => {
    managerRef.current = new ApkDownloadManager(downloadUrl, LATEST_REMOTE_APK.sizeMB, (p) => {
      setProgress(p);
      if (p.state === 'completed' && onNotify) {
        onNotify(true, `tradelab-options-v${LATEST_REMOTE_APK.versionName}.apk`, 'APK download complete! Tap Install to launch package installer.');
      }
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.cancel();
      }
    };
  }, [downloadUrl, onNotify]);

  const versionStatus = checkApkVersionStatus(CURRENT_APP_VERSION.versionCode, simulatedRemoteCode);

  const handleStartDownload = () => {
    setInstallStatusMessage(null);
    if (managerRef.current) {
      managerRef.current.start();
    }
  };

  const handlePauseDownload = () => {
    if (managerRef.current) {
      managerRef.current.pause();
    }
  };

  const handleResumeDownload = () => {
    if (managerRef.current) {
      managerRef.current.resume();
    }
  };

  const handleCancelDownload = () => {
    if (managerRef.current) {
      managerRef.current.cancel();
    }
  };

  const handleInstallApk = () => {
    const blob = progress.blob || managerRef.current?.getBlob();
    const blobUrl = progress.blobUrl || managerRef.current?.getBlobUrl() || downloadUrl;
    const filename = `tradelab-options-v${LATEST_REMOTE_APK.versionName}.apk`;

    const result = triggerAndroidApkInstall(blob || blobUrl, filename);
    setInstallStatusMessage(result.message);

    if (onNotify) {
      onNotify(true, filename, result.message);
    }
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setDownloadUrl(urlInput);
    if (managerRef.current) {
      managerRef.current.updateUrl(urlInput);
    }
    setIsEditingUrl(false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const formatMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <div className="flex flex-col gap-4 text-slate-800">
      {/* 1. APP HEADER & VERSION STATUS CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden border border-slate-700">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-base text-white tracking-tight">
                  TradeLab for Android
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  APK Build {LATEST_REMOTE_APK.versionCode}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Native performance, real-time Black-Scholes Greeks, offline payoff caching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="text-[11px] text-slate-400">Current App:</span>
            <span className="font-mono text-xs font-bold text-white">v{CURRENT_APP_VERSION.versionName}</span>
          </div>
        </div>

        {/* Version Check Alert Banner */}
        <div className="mt-4 pt-3 border-t border-slate-700/80">
          {versionStatus.status === 'SAME_VERSION' ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block text-blue-100">
                  Aapke paas already latest version (v{CURRENT_APP_VERSION.versionName}) hai!
                </span>
                <span className="text-blue-300/90 text-[11px]">
                  Same version ya reinstall karne ke liye aap neeche se APK dubara download kar sakte hain.
                </span>
              </div>
            </div>
          ) : versionStatus.status === 'NEWER_AVAILABLE' ? (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200">
              <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block text-emerald-100">
                  Naya update available: v{LATEST_REMOTE_APK.versionName} (Build {LATEST_REMOTE_APK.versionCode})
                </span>
                <span className="text-emerald-300/90 text-[11px]">
                  Naye features aur performance fixes ke sath update download karein.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block text-amber-100">
                  Developer / Newer local build (v{CURRENT_APP_VERSION.versionName})
                </span>
                <span className="text-amber-300/90 text-[11px]">
                  Server par v{LATEST_REMOTE_APK.versionName} release live hai.
                </span>
              </div>
            </div>
          )}

          {/* Quick Version Simulation Toggle (Helper to demonstrate both 'same version' and 'update available' states) */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-slate-400">Version check simulation:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSimulatedRemoteCode(CURRENT_APP_VERSION.versionCode)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  simulatedRemoteCode === CURRENT_APP_VERSION.versionCode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Same Version (v2.5.0)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedRemoteCode(260)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  simulatedRemoteCode === 260
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Simulate v2.6.0 Update
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. APK DOWNLOAD URL CARD */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              APK Download Source URL
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-mono">
              Placeholder
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isEditingUrl) {
                setUrlInput(downloadUrl);
              }
              setIsEditingUrl(!isEditingUrl);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {isEditingUrl ? 'Cancel' : 'Change URL'}
          </button>
        </div>

        {isEditingUrl ? (
          <form onSubmit={handleSaveCustomUrl} className="flex flex-col sm:flex-row gap-2 mt-1">
            <input
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://your-domain.com/downloads/app.apk"
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shrink-0"
            >
              Set APK URL
            </button>
          </form>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 break-all select-all flex items-center justify-between gap-2">
            <span className="truncate">{downloadUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(downloadUrl, 'url')}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-sans font-medium shrink-0"
            >
              {copiedSnippet === 'url' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Target Architecture: <strong className="text-slate-700 font-mono">arm64-v8a, armeabi-v7a</strong></span>
          <span>Size: <strong className="text-slate-700 font-mono">{LATEST_REMOTE_APK.sizeMB} MB</strong></span>
        </div>
      </div>

      {/* 3. DOWNLOAD ACTIONS & PROGRESS BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-4">
        {/* State A: Idle or Cancelled */}
        {(progress.state === 'idle' || progress.state === 'cancelled') && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Download size={16} className="text-blue-600" />
                <span>Download TradeLab APK</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct installation file for Android 8.0+ devices ({LATEST_REMOTE_APK.sizeMB} MB)
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartDownload}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>Download APK ({LATEST_REMOTE_APK.sizeMB} MB)</span>
            </button>
          </div>
        )}

        {/* State B: Downloading or Paused */}
        {(progress.state === 'downloading' || progress.state === 'paused') && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-semibold text-slate-900">
                  {progress.state === 'paused' ? 'Download Paused' : 'Downloading TradeLab APK...'}
                </span>
                <span className="font-mono text-slate-500">
                  ({formatMB(progress.downloadedBytes)} MB / {formatMB(progress.totalBytes)} MB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {progress.state === 'downloading' && (
                  <span className="text-[11px] font-mono text-emerald-600 font-semibold hidden sm:inline">
                    ~{(progress.downloadSpeedKBps / 1024).toFixed(1)} MB/s
                  </span>
                )}
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {progress.percent}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  progress.state === 'paused'
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Pause, Resume, Cancel Controls */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                File: <code className="text-slate-600 font-mono">tradelab-options-v{LATEST_REMOTE_APK.versionName}.apk</code>
              </span>

              <div className="flex items-center gap-2">
                {progress.state === 'downloading' ? (
                  <button
                    type="button"
                    onClick={handlePauseDownload}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pause size={12} />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeDownload}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelDownload}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle size={12} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State C: Completed */}
        {progress.state === 'completed' && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-950">
                    APK Download Successfully Completed! (100%)
                  </h5>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    File <strong className="font-mono">tradelab-options-v{LATEST_REMOTE_APK.versionName}.apk</strong> ready. Tap "Install APK" below.
                  </p>
                </div>
              </div>

              {/* INSTALL BUTTON */}
              <button
                type="button"
                onClick={handleInstallApk}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 animate-bounce duration-1000"
              >
                <Smartphone size={16} />
                <span>Install APK Now</span>
              </button>
            </div>

            {/* Install intent status feedback */}
            {installStatusMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                <Info size={15} className="text-blue-600 shrink-0" />
                <span>{installStatusMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>File saved to device Downloads.</span>
              <button
                type="button"
                onClick={handleStartDownload}
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Re-download APK
              </button>
            </div>
          </div>
        )}

        {/* State D: Error */}
        {progress.state === 'error' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-800 text-xs">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{progress.error || 'Download failed. Please check network or URL.'}</span>
            </div>
            <button
              type="button"
              onClick={handleStartDownload}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* 4. ANDROID 8+ (OREO TO ANDROID 14) UNKNOWN SOURCES PERMISSION GUIDANCE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowPermissionGuide(!showPermissionGuide)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Android 8+ "Install Unknown Apps" Permission Guide
              </span>
              <span className="text-[11px] text-slate-500">
                Apne phone par unknown sources allow karne ka asan tarika
              </span>
            </div>
          </div>
          {showPermissionGuide ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showPermissionGuide && (
          <div className="p-4 border-t border-slate-200 flex flex-col gap-3 bg-white">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950">Android 8.0 (API 26) aur newer devices ke liye:</strong>
                Android 8+ mein har app (Chrome, Browser, File Manager) ko alag se permission deni hoti hai.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ANDROID_8_PERMISSION_STEPS.map((step) => (
                <div key={step.step} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {step.step}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-7">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. NATIVE FILEPROVIDER & KOTLIN INTENT DEVELOPER DOCUMENTATION */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowDeveloperGuide(!showDeveloperGuide)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-indigo-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Android FileProvider & Intent Implementation (Developer Setup)
              </span>
              <span className="text-[11px] text-slate-500">
                AndroidManifest.xml aur Kotlin code snippet for native APK installer
              </span>
            </div>
          </div>
          {showDeveloperGuide ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showDeveloperGuide && (
          <div className="p-4 border-t border-slate-200 flex flex-col gap-4 bg-slate-900 text-slate-200 font-mono text-xs">
            {/* Manifest XML */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-sans font-semibold text-slate-300">1. AndroidManifest.xml (FileProvider):</span>
                <button
                  type="button"
                  onClick={() => handleCopy(NATIVE_FILEPROVIDER_XML, 'xml')}
                  className="text-blue-400 hover:text-blue-300 font-sans"
                >
                  {copiedSnippet === 'xml' ? 'Copied XML!' : 'Copy XML'}
                </button>
              </div>
              <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-slate-300 border border-slate-800 leading-relaxed">
                {NATIVE_FILEPROVIDER_XML}
              </pre>
            </div>

            {/* Kotlin Intent */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-sans font-semibold text-slate-300">2. Kotlin Intent (ACTION_VIEW with FileProvider):</span>
                <button
                  type="button"
                  onClick={() => handleCopy(NATIVE_FILEPROVIDER_KOTLIN, 'kt')}
                  className="text-blue-400 hover:text-blue-300 font-sans"
                >
                  {copiedSnippet === 'kt' ? 'Copied Kotlin!' : 'Copy Kotlin'}
                </button>
              </div>
              <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-emerald-400 border border-slate-800 leading-relaxed">
                {NATIVE_FILEPROVIDER_KOTLIN}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 6. WHAT'S NEW IN THIS APK RELEASE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Layers size={14} className="text-blue-600" />
          <span>What's New in v{LATEST_REMOTE_APK.versionName} APK</span>
        </span>
        <ul className="space-y-1.5 pl-1">
          {LATEST_REMOTE_APK.changelog.map((item, idx) => (
            <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
