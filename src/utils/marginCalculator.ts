import { OptionLeg } from '../types/options';

export interface MarginBreakdown {
  totalMargin: number;
  shortLegsMargin: number;
  shortLegsCount: number;
  shortLotsCount: number;
  longLegsPremium: number;
  longLegsCount: number;
  isEntirelyBuy: boolean;
  hasShortLegs: boolean;
}

/**
 * Calculates estimated margin required for options positions
 * Formula:
 * - For every short (Sell) option leg: ₹1,00,000 per lot
 * - For every long (Buy) option leg: total premium paid (entryPrice * lotSize * lots)
 * - If strategy is entirely Buy (e.g. Long Call): margin is strictly the total premium paid
 */
export function calculateEstimatedMargin(legs: OptionLeg[]): MarginBreakdown {
  const activeLegs = legs.filter(l => l.enabled);

  if (activeLegs.length === 0) {
    return {
      totalMargin: 0,
      shortLegsMargin: 0,
      shortLegsCount: 0,
      shortLotsCount: 0,
      longLegsPremium: 0,
      longLegsCount: 0,
      isEntirelyBuy: false,
      hasShortLegs: false
    };
  }

  let shortLegsMargin = 0;
  let shortLegsCount = 0;
  let shortLotsCount = 0;
  let longLegsPremium = 0;
  let longLegsCount = 0;

  for (const leg of activeLegs) {
    if (leg.action === 'SELL') {
      shortLegsCount += 1;
      shortLotsCount += leg.lots;
      // ₹1,00,000 per short lot
      shortLegsMargin += 100000 * leg.lots;
    } else {
      longLegsCount += 1;
      // Total premium paid for long leg
      const totalUnits = leg.lots * leg.lotSize;
      longLegsPremium += leg.entryPrice * totalUnits;
    }
  }

  const isEntirelyBuy = shortLegsCount === 0 && longLegsCount > 0;
  const hasShortLegs = shortLegsCount > 0;

  const totalMargin = isEntirelyBuy
    ? Math.round(longLegsPremium)
    : Math.round(shortLegsMargin + longLegsPremium);

  return {
    totalMargin,
    shortLegsMargin: Math.round(shortLegsMargin),
    shortLegsCount,
    shortLotsCount,
    longLegsPremium: Math.round(longLegsPremium),
    longLegsCount,
    isEntirelyBuy,
    hasShortLegs
  };
}

/**
 * Format currency in Indian numbering format (e.g. ₹1,25,000)
 */
export function formatMarginCurrency(amount: number, currency: string = '₹'): string {
  try {
    return `${currency}${Math.round(amount).toLocaleString('en-IN')}`;
  } catch {
    return `${currency}${Math.round(amount).toLocaleString()}`;
  }
}
