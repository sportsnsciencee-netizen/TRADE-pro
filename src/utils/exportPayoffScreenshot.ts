import html2canvas from 'html2canvas';
import { downloadDataUrl } from './fileDownloader';

export interface ScreenshotExportResult {
  success: boolean;
  dataUrl?: string;
  filename?: string;
  message?: string;
  error?: string;
}

/**
 * Captures an HTML element (e.g. Payoff chart) using html2canvas
 * and triggers a browser file download of the high-res PNG image.
 */
export async function captureAndDownloadPayoffChart(
  element: HTMLElement,
  symbol: string = 'NIFTY'
): Promise<ScreenshotExportResult> {
  try {
    const filename = `TradeLab_Payoff_${symbol}_${new Date().toISOString().slice(0, 10)}.png`;

    // High quality canvas render with clean white background
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // 2x DPI for ultra-crisp sharing on WhatsApp & mobile
      useCORS: true,
      logging: false,
      allowTaint: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const dataUrl = canvas.toDataURL('image/png');

    // Trigger universal mobile & desktop download
    const dlResult = await downloadDataUrl(dataUrl, filename);

    return {
      success: dlResult.success,
      dataUrl,
      filename,
      message: dlResult.message,
      error: dlResult.error
    };
  } catch (err: any) {
    console.error('Failed to capture Payoff chart screenshot:', err);
    return {
      success: false,
      error: err?.message || 'Screenshot capture failed'
    };
  }
}
