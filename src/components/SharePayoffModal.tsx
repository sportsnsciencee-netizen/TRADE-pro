import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  Share2,
  MessageCircle,
  Download,
  FileText,
  FileCheck,
  AlertTriangle,
  Loader2,
  Printer
} from 'lucide-react';
import { MarketEnvironment, OptionLeg, PositionMetrics } from '../types/options';
import { downloadDataUrl, downloadTextContent, generatePrintableStrategyReportHtml } from '../utils/fileDownloader';

interface SharePayoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: MarketEnvironment;
  legs: OptionLeg[];
  metrics: PositionMetrics;
  filename?: string;
  dataUrl?: string;
}

export const SharePayoffModal: React.FC<SharePayoffModalProps> = ({
  isOpen,
  onClose,
  environment,
  legs,
  metrics,
  filename,
  dataUrl
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    file?: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentFilename = filename || `TradeLab_Payoff_${environment.symbol}_${new Date().toISOString().slice(0, 10)}.png`;

  const fmtCurrency = (val: number | 'Unlimited') => {
    if (val === 'Unlimited') return 'Unlimited';
    return `${environment.currency}${Math.round(val).toLocaleString()}`;
  };

  const legsSummary = legs
    .filter(l => l.enabled)
    .map(l => `${l.action} ${l.strike} ${l.type === 'CALL' ? 'CE' : l.type === 'PUT' ? 'PE' : 'FUT'}`)
    .join(', ');

  const shareText = `📊 *TradeLab Options Strategy Report*
*Underlying:* ${environment.symbol} @ ₹${environment.spotPrice.toLocaleString()} (${environment.changePercent ?? 2.01}%)
*Legs (${legs.filter(l => l.enabled).length}):* ${legsSummary || 'Custom Strategy'}
*Max Profit:* ${fmtCurrency(metrics.maxProfit)}
*Max Loss:* ${fmtCurrency(metrics.maxLoss)}
*Break-evens:* ${metrics.breakevens.length > 0 ? metrics.breakevens.join(', ') : 'None'}
*Probability of Profit (POP):* ${metrics.probabilityOfProfit}%

📈 _Payoff Chart Image generated via TradeLab._`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  // Handle re-downloading PNG image
  const handleDownloadImage = async () => {
    if (!dataUrl) return;
    setIsDownloading(true);
    setDownloadStatus(null);
    try {
      const res = await downloadDataUrl(dataUrl, currentFilename);
      if (res.success) {
        setDownloadStatus({
          type: 'success',
          message: 'Chart PNG image downloaded successfully to your device!',
          file: currentFilename
        });
      } else {
        setDownloadStatus({
          type: 'error',
          message: res.message || 'Download failed. Please check browser permissions.'
        });
      }
    } catch (e: any) {
      setDownloadStatus({
        type: 'error',
        message: e?.message || 'Download failed.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle downloading printable PDF / HTML Document Report
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    setDownloadStatus(null);
    try {
      const reportHtml = generatePrintableStrategyReportHtml(environment, legs, metrics, dataUrl);
      const reportName = `TradeLab_Report_${environment.symbol}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await downloadTextContent(reportHtml, reportName, 'text/html;charset=utf-8');

      if (res.success) {
        setDownloadStatus({
          type: 'success',
          message: 'Printable Strategy Document (PDF/HTML) downloaded successfully!',
          file: reportName
        });
      } else {
        setDownloadStatus({
          type: 'error',
          message: res.message || 'Failed to download document report.'
        });
      }
    } catch (e: any) {
      setDownloadStatus({
        type: 'error',
        message: e?.message || 'Report download failed.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download size={19} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Download & Share Payoff Chart
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Save image to mobile/desktop & share on WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Download Status Feedback Banner */}
        {downloadStatus ? (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs animate-in fade-in ${
              downloadStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {downloadStatus.type === 'success' ? (
                <FileCheck size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div className="truncate">
                <p className="font-bold">{downloadStatus.message}</p>
                {downloadStatus.file && (
                  <p className="text-[11px] font-mono opacity-80 truncate">
                    File: {downloadStatus.file}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDownloadStatus(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold px-1.5 cursor-pointer shrink-0"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
            <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Chart snapshot ready for download</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate font-mono">
                {currentFilename}
              </p>
            </div>
          </div>
        )}

        {/* Thumbnail Preview if dataUrl available */}
        {dataUrl && (
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 flex flex-col items-center justify-center max-h-52 group">
            <img
              src={dataUrl}
              alt="Payoff Screenshot Preview"
              className="max-h-44 w-auto object-contain rounded-lg shadow-2xs"
            />
            {/* Quick overlay download button */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
              >
                <Download size={14} />
                <span>Save PNG</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Download Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Download Image Button */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading || !dataUrl}
            className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download PNG Image</span>
              </>
            )}
          </button>

          {/* Download PDF/HTML Report Button */}
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Printer size={15} className="text-slate-500" />
            <span>Download PDF / HTML</span>
          </button>
        </div>

        {/* WhatsApp & Text Copy Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Share Strategy Summary with WhatsApp:
          </span>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
            {shareText}
          </div>
        </div>

        {/* Footer Actions: Copy Text & WhatsApp Link */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full sm:flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            {copied ? (
              <>
                <Check size={15} className="text-emerald-600" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={15} className="text-slate-600" />
                <span>Copy Summary Text</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer no-underline"
          >
            <MessageCircle size={15} />
            <span>Open WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
