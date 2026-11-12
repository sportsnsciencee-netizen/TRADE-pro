/**
 * Universal Mobile & Desktop File Downloader Utility
 * Provides reliable downloading of images, reports, PDF/HTML documents, and CSV/JSON data.
 * Compatible with modern desktop browsers, mobile Safari/Chrome, and embedded webviews.
 */

export interface DownloadResult {
  success: boolean;
  filename: string;
  message: string;
  error?: string;
}

/**
 * Converts a Base64/DataURL to a Blob for safe mobile & desktop download
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Downloads a Blob directly to the user's device with mobile & desktop compatibility.
 * Checks for permissions and provides fallback methods.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string
): Promise<DownloadResult> {
  try {
    // 1. Check if Modern File System Access API is supported and user prefers saving location
    if ('showSaveFilePicker' in window && (window as any).isSecureContext) {
      try {
        const ext = filename.split('.').pop() || 'bin';
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'TradeLab Document',
              accept: {
                [blob.type || 'application/octet-stream']: [`.${ext}`]
              }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          success: true,
          filename,
          message: `Saved "${filename}" successfully!`
        };
      } catch (pickerErr: any) {
        // If user cancelled the picker dialog (AbortError), don't trigger anchor fallback
        if (pickerErr.name === 'AbortError') {
          return {
            success: false,
            filename,
            message: 'Download cancelled by user.'
          };
        }
        // Otherwise, fall back to standard anchor click
        console.warn('File picker failed or permission denied, using standard download fallback', pickerErr);
      }
    }

    // 2. Standard Universal Anchor Download (Works on Mobile Safari, Android Chrome, Desktop)
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener';

    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1200);

    return {
      success: true,
      filename,
      message: `File "${filename}" downloaded successfully to your device.`
    };
  } catch (err: any) {
    console.error('Download execution error:', err);
    return {
      success: false,
      filename,
      message: 'Failed to download file. Please check browser permissions.',
      error: err?.message || 'Unknown download error'
    };
  }
}

/**
 * Downloads a dataURL (e.g. from html2canvas screenshot)
 */
export async function downloadDataUrl(
  dataUrl: string,
  filename: string
): Promise<DownloadResult> {
  try {
    const blob = dataUrlToBlob(dataUrl);
    return await downloadBlob(blob, filename);
  } catch (err: any) {
    console.error('DataURL download failed:', err);
    return {
      success: false,
      filename,
      message: 'Failed to process file image for download.',
      error: err?.message
    };
  }
}

/**
 * Downloads text or structured data (CSV, JSON, HTML)
 */
export async function downloadTextContent(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): Promise<DownloadResult> {
  const blob = new Blob([content], { type: mimeType });
  return await downloadBlob(blob, filename);
}

/**
 * Generates an institutional-grade Printable HTML / PDF Strategy Report
 */
export function generatePrintableStrategyReportHtml(
  environment: any,
  legs: any[],
  metrics: any,
  chartDataUrl?: string
): string {
  const activeLegs = legs.filter((l: any) => l.enabled);
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const legsRows = activeLegs.map((l: any, i: number) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">#${i + 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
        <span style="font-weight: 700; color: ${l.action === 'BUY' ? '#2563eb' : '#dc2626'};">${l.action}</span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${l.strike} ${l.type}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${l.expiry}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${l.lots} lot (${l.lots * l.lotSize} qty)</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 600;">₹${l.entryPrice}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TradeLab Strategy Report - ${environment.symbol}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; line-height: 1.5; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 850px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric-box { background: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .metric-val { font-size: 16px; font-weight: 800; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin-top: 12px; }
    th { background: #f8fafc; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
    .chart-container { margin: 20px 0; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff; }
    .chart-img { max-width: 100%; height: auto; border-radius: 6px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; box-shadow: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 22px; color: #1e293b;">TradeLab Options Strategy Document</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Generated on ${nowStr} (IST)</p>
      </div>
      <div style="text-align: right;">
        <span class="badge" style="background: #dbeafe; color: #1d4ed8; font-size: 14px;">${environment.symbol}</span>
        <div style="font-size: 13px; font-weight: 700; margin-top: 4px;">Spot: ₹${environment.spotPrice.toLocaleString()}</div>
      </div>
    </div>

    <!-- Executive Metrics Grid -->
    <div class="grid">
      <div class="metric-box">
        <div class="metric-label">Max Profit</div>
        <div class="metric-val" style="color: #059669;">${metrics?.maxProfit === 'Unlimited' ? 'Unlimited ∞' : `+₹${Math.round(metrics?.maxProfit || 0).toLocaleString()}`}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Max Loss</div>
        <div class="metric-val" style="color: #e11d48;">${metrics?.maxLoss === 'Unlimited' ? 'Unlimited' : `-₹${Math.abs(Math.round(metrics?.maxLoss || 0)).toLocaleString()}`}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Prob. of Profit (POP)</div>
        <div class="metric-val" style="color: #2563eb;">${metrics?.probabilityOfProfit || 50}%</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Risk-Reward</div>
        <div class="metric-val">${metrics?.riskRewardRatio || 'N/A'}</div>
      </div>
    </div>

    <!-- Payoff Chart Image if embedded -->
    ${chartDataUrl ? `
      <div class="chart-container">
        <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">Payoff Curve Visual</div>
        <img class="chart-img" src="${chartDataUrl}" alt="Payoff Chart Snapshot" />
      </div>
    ` : ''}

    <!-- Strategy Leg Positions Table -->
    <div style="margin-top: 16px;">
      <h3 style="font-size: 14px; margin: 0 0 8px 0; color: #334155;">Active Strategy Legs (${activeLegs.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Leg</th>
            <th>Action</th>
            <th>Option Contract</th>
            <th>Expiry</th>
            <th>Size / Lots</th>
            <th>Entry Premium</th>
          </tr>
        </thead>
        <tbody>
          ${legsRows || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8;">No legs added</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Greeks Summary -->
    <div style="margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">Portfolio Greeks & Risk Exposure</div>
      <div style="display: flex; gap: 20px; font-size: 12px; font-family: monospace;">
        <div><strong>Delta (Δ):</strong> ${(metrics?.netDelta || 0).toFixed(2)}</div>
        <div><strong>Gamma (Γ):</strong> ${(metrics?.netGamma || 0).toFixed(4)}</div>
        <div><strong>Theta (θ/day):</strong> ₹${Math.round(metrics?.netTheta || 0).toLocaleString()}</div>
        <div><strong>Vega (ν):</strong> ₹${Math.round(metrics?.netVega || 0).toLocaleString()}</div>
      </div>
    </div>

    <div class="footer">
      TradeLab Options Engine • Educational & Analytical Tool • Real-time Black-Scholes Model
      <div class="no-print" style="margin-top: 10px;">
        <button onclick="window.print()" style="padding: 6px 14px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
          Print / Save as PDF
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
}
