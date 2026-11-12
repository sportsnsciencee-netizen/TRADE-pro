import { OptionLeg, MarketEnvironment } from '../types/options';

export interface ChargesBreakdown {
  brokerage: number;
  stt: number;               // Securities Transaction Tax
  exchangeTxnCharge: number; // NSE/BSE Transaction charges
  gst: number;               // 18% on (Brokerage + Exchange Charges + SEBI)
  sebiCharges: number;       // ₹10 per crore (0.0001%)
  stampDuty: number;         // 0.003% on Buy side premium
  totalCharges: number;
  totalTurnover: number;     // Premium turnover (Buy + Sell)
  orderCount: number;        // Round-trip orders (entry + exit)
}

export interface NetPnLCalculation {
  grossPnL: number;
  charges: ChargesBreakdown;
  netPnL: number;
  chargesRatio: number; // Charges as % of Gross P&L (if gross > 0)
}

/**
 * Calculates accurate Indian brokerage, STT, Exchange transaction charges,
 * GST, SEBI charges, and Stamp Duty for options trading (NSE standards).
 * 
 * Assumptions:
 * - Brokerage: Flat ₹20 per executed order (round-trip = ₹20 on Entry + ₹20 on Exit = ₹40 per leg)
 * - Premium Turnover = Quantity (lots * lotSize) * Premium
 * - STT: 0.1% on Option Sell Turnover (applicable on sell trades)
 * - Exchange Txn Charge: 0.05% of Premium Turnover
 * - SEBI Charges: 0.0001% (₹10 / crore) of Premium Turnover
 * - Stamp Duty: 0.003% on Option Buy Turnover
 * - GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
 */
export function calculateIndianOptionsCharges(
  legs: OptionLeg[],
  scenarioTargetPnL: number = 0
): ChargesBreakdown {
  const activeLegs = legs.filter(l => l.enabled);

  if (activeLegs.length === 0) {
    return {
      brokerage: 0,
      stt: 0,
      exchangeTxnCharge: 0,
      gst: 0,
      sebiCharges: 0,
      stampDuty: 0,
      totalCharges: 0,
      totalTurnover: 0,
      orderCount: 0
    };
  }

  let totalBuyPremiumTurnover = 0;
  let totalSellPremiumTurnover = 0;
  let totalOrders = 0; // Round-trip: 2 orders per leg (Entry + Exit)

  activeLegs.forEach(leg => {
    const qty = leg.lots * leg.lotSize;
    const entryTurnover = qty * leg.entryPrice;

    // For round-trip calculation:
    // Entry order + Exit order
    totalOrders += 2;

    if (leg.action === 'BUY') {
      // Entry is Buy, Exit is Sell
      totalBuyPremiumTurnover += entryTurnover;
      // Assume exit premium is roughly entry adjusted for scenario, or conservative baseline
      const estimatedExitTurnover = Math.max(0, entryTurnover + (scenarioTargetPnL / activeLegs.length));
      totalSellPremiumTurnover += estimatedExitTurnover;
    } else {
      // Entry is Sell, Exit is Buy
      totalSellPremiumTurnover += entryTurnover;
      const estimatedExitTurnover = Math.max(0, entryTurnover - (scenarioTargetPnL / activeLegs.length));
      totalBuyPremiumTurnover += estimatedExitTurnover;
    }
  });

  const totalPremiumTurnover = totalBuyPremiumTurnover + totalSellPremiumTurnover;

  // 1. Brokerage: Flat ₹20 per order (Zerodha/Groww model: ₹20 buy + ₹20 sell = ₹40 per leg)
  const brokerage = totalOrders * 20;

  // 2. STT: 0.1% on Sell Side Premium turnover
  const stt = Math.round(totalSellPremiumTurnover * 0.001 * 100) / 100;

  // 3. Exchange Transaction Charges: 0.05% of total premium turnover
  const exchangeTxnCharge = Math.round(totalPremiumTurnover * 0.0005 * 100) / 100;

  // 4. SEBI Charges: ₹10 per crore (0.0001%)
  const sebiCharges = Math.max(0.01, Math.round(totalPremiumTurnover * 0.000001 * 100) / 100);

  // 5. Stamp Duty: 0.003% on Buy side premium turnover
  const stampDuty = Math.round(totalBuyPremiumTurnover * 0.00003 * 100) / 100;

  // 6. GST: 18% on (Brokerage + Exchange Transaction Charges + SEBI Turnover Charges)
  const gstBase = brokerage + exchangeTxnCharge + sebiCharges;
  const gst = Math.round(gstBase * 0.18 * 100) / 100;

  // Total Charges
  const totalCharges = Math.round((brokerage + stt + exchangeTxnCharge + gst + sebiCharges + stampDuty) * 100) / 100;

  return {
    brokerage,
    stt,
    exchangeTxnCharge,
    gst,
    sebiCharges,
    stampDuty,
    totalCharges,
    totalTurnover: Math.round(totalPremiumTurnover),
    orderCount: totalOrders
  };
}

/**
 * Computes Net P&L after all Indian deductions.
 */
export function calculateNetPnL(
  grossPnL: number,
  legs: OptionLeg[]
): NetPnLCalculation {
  const charges = calculateIndianOptionsCharges(legs, grossPnL);
  const netPnL = Math.round((grossPnL - charges.totalCharges) * 100) / 100;
  const chargesRatio = grossPnL > 0 ? Math.min(100, Math.round((charges.totalCharges / grossPnL) * 100)) : 0;

  return {
    grossPnL,
    charges,
    netPnL,
    chargesRatio
  };
}
