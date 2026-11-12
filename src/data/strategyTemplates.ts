import { MarketEnvironment, OptionLeg } from '../types/options';
import { calculateBSM, getTimeToExpiryInYears } from '../utils/blackScholes';

export interface StrategyTemplate {
  id: string;
  name: string;
  category: 'Single' | 'Spreads' | 'Volatility / Neutral' | 'Custom / Hedging';
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'High Volatility' | 'Income';
  displayCategory: 'Bullish' | 'Bearish' | 'Neutral' | 'Others';
  sparklineType: string;
  isZeroCost?: boolean;
  isCalendarModal?: boolean;
  calendarType?: 'calendar' | 'double-calendar' | 'triple-calendar';
  description: string;
  createLegs: (env: MarketEnvironment, customExpiry?: string) => OptionLeg[];
}

// Helper to determine realistic strike step for any underlying spot price
export function getStrikeStep(spot: number): number {
  if (spot > 30000) return 200;
  if (spot > 15000) return 100;
  if (spot > 5000) return 50;
  if (spot > 1000) return 20;
  if (spot > 200) return 5;
  if (spot > 50) return 2.5;
  return 1;
}

export function roundToStrike(price: number, step: number): number {
  return Math.round(price / step) * step;
}

// Generate standard expiry dates (near = 7 days, far = 28 days)
export function getExpiryDate(baseDateStr: string, daysAhead: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

// Helper to calculate realistic default entry premium using BSM
export function getLegPremium(
  spot: number,
  strike: number,
  type: 'CALL' | 'PUT' | 'FUTURE',
  baseDate: string,
  expiryDate: string,
  iv: number,
  r: number
): number {
  const t = getTimeToExpiryInYears(baseDate, expiryDate);
  const result = calculateBSM(spot, strike, t, r / 100, iv / 100, type);
  return Math.max(0.5, Math.round(result.price * 20) / 20);
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  // ==========================================
  // BULLISH STRATEGIES (9 items as specified)
  // ==========================================
  {
    id: 'buy-call',
    name: 'Buy Call',
    category: 'Single',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'buy-call',
    description: 'Long ATM Call with limited risk (premium paid) and unlimited upside profit potential.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const entryPrice = getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);

      return [
        {
          id: 'leg-1',
          name: 'Long Call',
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike,
          expiry,
          lotSize: env.symbol.includes('NIFTY') ? 50 : 100,
          lots: 1,
          entryPrice
        }
      ];
    }
  },
  {
    id: 'sell-put',
    name: 'Sell Put',
    category: 'Single',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'sell-put',
    description: 'Short OTM Put collecting upfront premium, profiting if spot stays above the strike.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice * 0.98, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const entryPrice = getLegPremium(env.spotPrice, strike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate);

      return [
        {
          id: 'leg-1',
          name: 'Short Put',
          enabled: true,
          action: 'SELL',
          type: 'PUT',
          strike,
          expiry,
          lotSize: env.symbol.includes('NIFTY') ? 50 : 100,
          lots: 1,
          entryPrice
        }
      ];
    }
  },
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'bull-call-spread',
    description: 'Buy ATM Call and sell OTM Call to reduce cost basis and limit downside risk.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const k1 = roundToStrike(env.spotPrice, step);
      const k2 = roundToStrike(env.spotPrice * 1.025, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const p1 = getLegPremium(env.spotPrice, k1, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);
      const p2 = getLegPremium(env.spotPrice, k2, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        {
          id: 'leg-1',
          name: 'Buy ATM Call',
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: k1,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: p1
        },
        {
          id: 'leg-2',
          name: 'Sell OTM Call',
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: k2,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: p2
        }
      ];
    }
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'bull-put-spread',
    description: 'Sell OTM Put and buy further OTM Put for defined-risk net credit collection.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const kSell = roundToStrike(env.spotPrice * 0.985, step);
      const kBuy = roundToStrike(env.spotPrice * 0.965, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const pSell = getLegPremium(env.spotPrice, kSell, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate);
      const pBuy = getLegPremium(env.spotPrice, kBuy, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        {
          id: 'leg-1',
          name: 'Sell Put (Credit)',
          enabled: true,
          action: 'SELL',
          type: 'PUT',
          strike: kSell,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: pSell
        },
        {
          id: 'leg-2',
          name: 'Buy Wing Put (Hedge)',
          enabled: true,
          action: 'BUY',
          type: 'PUT',
          strike: kBuy,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: pBuy
        }
      ];
    }
  },
  {
    id: 'call-ratio-back-spread',
    name: 'Call Ratio Back Spread',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'call-ratio-back-spread',
    description: 'Sell 1 ATM Call and Buy 2 OTM Calls to benefit from an explosive upward rally.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const kSell = roundToStrike(env.spotPrice, step);
      const kBuy = roundToStrike(env.spotPrice * 1.025, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const pSell = getLegPremium(env.spotPrice, kSell, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);
      const pBuy = getLegPremium(env.spotPrice, kBuy, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        {
          id: 'leg-1',
          name: 'Sell 1x ATM Call',
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: kSell,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: pSell
        },
        {
          id: 'leg-2',
          name: 'Buy 2x OTM Call',
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: kBuy,
          expiry,
          lotSize,
          lots: 2,
          entryPrice: pBuy
        }
      ];
    }
  },
  {
    id: 'long-calendar-calls',
    name: 'Long Calendar with Calls',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'long-calendar-calls',
    description: 'Sell near-term slightly OTM call and buy longer-term call at the same strike.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice * 1.015, step);
      const nearExpiry = customExpiry || getExpiryDate(env.baseDate, 7);
      const farExpiry = getExpiryDate(env.baseDate, 28);
      const pNear = getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, nearExpiry, env.globalIV, env.interestRate);
      const pFar = getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, farExpiry, env.globalIV, env.interestRate);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        {
          id: 'leg-1',
          name: 'Sell Near Call',
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNear
        },
        {
          id: 'leg-2',
          name: 'Buy Far Call',
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFar
        }
      ];
    }
  },
  {
    id: 'bull-condor',
    name: 'Bull Condor',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'bull-condor',
    description: 'Four-strike call condor targeted at a moderately higher consolidation corridor.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const k1 = roundToStrike(env.spotPrice * 0.99, step);
      const k2 = roundToStrike(env.spotPrice * 1.02, step);
      const k3 = roundToStrike(env.spotPrice * 1.04, step);
      const k4 = roundToStrike(env.spotPrice * 1.07, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Buy Call K1', enabled: true, action: 'BUY', type: 'CALL', strike: k1, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k1, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Sell Call K2', enabled: true, action: 'SELL', type: 'CALL', strike: k2, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k2, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-3', name: 'Sell Call K3', enabled: true, action: 'SELL', type: 'CALL', strike: k3, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k3, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-4', name: 'Buy Call K4', enabled: true, action: 'BUY', type: 'CALL', strike: k4, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k4, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'bull-butterfly',
    name: 'Bull Butterfly',
    category: 'Spreads',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'bull-butterfly',
    description: 'Long OTM call butterfly targeting a specific upper strike with high risk-to-reward.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const kCenter = roundToStrike(env.spotPrice * 1.03, step);
      const wingDist = step * 2;
      const kLower = kCenter - wingDist;
      const kUpper = kCenter + wingDist;
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Buy Lower Call', enabled: true, action: 'BUY', type: 'CALL', strike: kLower, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, kLower, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Sell 2x Center Call', enabled: true, action: 'SELL', type: 'CALL', strike: kCenter, expiry, lotSize, lots: 2, entryPrice: getLegPremium(env.spotPrice, kCenter, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-3', name: 'Buy Upper Call', enabled: true, action: 'BUY', type: 'CALL', strike: kUpper, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, kUpper, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'range-forward',
    name: 'Range Forward',
    category: 'Custom / Hedging',
    sentiment: 'Bullish',
    displayCategory: 'Bullish',
    sparklineType: 'range-forward',
    isZeroCost: true,
    description: 'Zero-cost risk reversal: Sell OTM Put to fund purchase of OTM Call.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const putStrike = roundToStrike(env.spotPrice * 0.97, step);
      const callStrike = roundToStrike(env.spotPrice * 1.03, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const putPrem = getLegPremium(env.spotPrice, putStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        {
          id: 'leg-1',
          name: 'Short OTM Put (Funds Call)',
          enabled: true,
          action: 'SELL',
          type: 'PUT',
          strike: putStrike,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: putPrem
        },
        {
          id: 'leg-2',
          name: 'Long OTM Call (Zero Cost)',
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: callStrike,
          expiry,
          lotSize,
          lots: 1,
          entryPrice: putPrem // balanced zero-cost collar
        }
      ];
    }
  },

  // ==========================================
  // BEARISH STRATEGIES
  // ==========================================
  {
    id: 'buy-put',
    name: 'Buy Put',
    category: 'Single',
    sentiment: 'Bearish',
    displayCategory: 'Bearish',
    sparklineType: 'buy-put',
    description: 'Direct downside speculation or portfolio crash protection with capped loss.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const entryPrice = getLegPremium(env.spotPrice, strike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate);

      return [
        {
          id: 'leg-1',
          name: 'Long ATM Put',
          enabled: true,
          action: 'BUY',
          type: 'PUT',
          strike,
          expiry,
          lotSize: env.symbol.includes('NIFTY') ? 50 : 100,
          lots: 1,
          entryPrice
        }
      ];
    }
  },
  {
    id: 'sell-call',
    name: 'Sell Call',
    category: 'Single',
    sentiment: 'Bearish',
    displayCategory: 'Bearish',
    sparklineType: 'sell-call',
    description: 'Sell OTM Call collecting premium, profiting if underlying fails to break out.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice * 1.02, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const entryPrice = getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate);

      return [
        {
          id: 'leg-1',
          name: 'Short OTM Call',
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike,
          expiry,
          lotSize: env.symbol.includes('NIFTY') ? 50 : 100,
          lots: 1,
          entryPrice
        }
      ];
    }
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    category: 'Spreads',
    sentiment: 'Bearish',
    displayCategory: 'Bearish',
    sparklineType: 'bear-put-spread',
    description: 'Buy ATM Put and sell OTM Put for defined-cost downside profit capture.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const k1 = roundToStrike(env.spotPrice, step);
      const k2 = roundToStrike(env.spotPrice * 0.975, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Buy ATM Put', enabled: true, action: 'BUY', type: 'PUT', strike: k1, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k1, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Sell OTM Put', enabled: true, action: 'SELL', type: 'PUT', strike: k2, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, k2, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    category: 'Spreads',
    sentiment: 'Bearish',
    displayCategory: 'Bearish',
    sparklineType: 'bear-call-spread',
    description: 'Sell OTM Call and buy higher Call for upfront net credit and limited risk.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const kSell = roundToStrike(env.spotPrice * 1.015, step);
      const kBuy = roundToStrike(env.spotPrice * 1.035, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Sell Call (Credit)', enabled: true, action: 'SELL', type: 'CALL', strike: kSell, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, kSell, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Buy Wing Call', enabled: true, action: 'BUY', type: 'CALL', strike: kBuy, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, kBuy, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'put-ratio-back-spread',
    name: 'Put Ratio Back Spread',
    category: 'Spreads',
    sentiment: 'Bearish',
    displayCategory: 'Bearish',
    sparklineType: 'put-ratio-back-spread',
    description: 'Sell 1 ATM Put and buy 2 OTM Puts for explosive gains during steep market sell-offs.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const kSell = roundToStrike(env.spotPrice, step);
      const kBuy = roundToStrike(env.spotPrice * 0.975, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Sell 1x ATM Put', enabled: true, action: 'SELL', type: 'PUT', strike: kSell, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, kSell, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Buy 2x OTM Put', enabled: true, action: 'BUY', type: 'PUT', strike: kBuy, expiry, lotSize, lots: 2, entryPrice: getLegPremium(env.spotPrice, kBuy, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },

  // ==========================================
  // NEUTRAL STRATEGIES
  // ==========================================
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    category: 'Volatility / Neutral',
    sentiment: 'Income',
    displayCategory: 'Neutral',
    sparklineType: 'short-straddle',
    description: 'Sell ATM Call & Put to collect max theta premium when minimal price movement is expected.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 7);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Short ATM Call', enabled: true, action: 'SELL', type: 'CALL', strike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Short ATM Put', enabled: true, action: 'SELL', type: 'PUT', strike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, strike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    category: 'Volatility / Neutral',
    sentiment: 'Income',
    displayCategory: 'Neutral',
    sparklineType: 'short-strangle',
    description: 'Sell OTM Call and OTM Put outside the standard deviation range for high probability theta capture.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const pStrike = roundToStrike(env.spotPrice * 0.965, step);
      const cStrike = roundToStrike(env.spotPrice * 1.035, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Short OTM Put', enabled: true, action: 'SELL', type: 'PUT', strike: pStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, pStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Short OTM Call', enabled: true, action: 'SELL', type: 'CALL', strike: cStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, cStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    category: 'Volatility / Neutral',
    sentiment: 'Income',
    displayCategory: 'Neutral',
    sparklineType: 'iron-condor',
    description: 'Four-leg market-neutral defined-risk structure profiting from range-bound consolidation.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      const putBuyStrike = roundToStrike(env.spotPrice * 0.95, step);
      const putSellStrike = roundToStrike(env.spotPrice * 0.975, step);
      const callSellStrike = roundToStrike(env.spotPrice * 1.025, step);
      const callBuyStrike = roundToStrike(env.spotPrice * 1.05, step);

      return [
        { id: 'leg-1', name: 'Buy Wing Put', enabled: true, action: 'BUY', type: 'PUT', strike: putBuyStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, putBuyStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Sell Credit Put', enabled: true, action: 'SELL', type: 'PUT', strike: putSellStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, putSellStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-3', name: 'Sell Credit Call', enabled: true, action: 'SELL', type: 'CALL', strike: callSellStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, callSellStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-4', name: 'Buy Wing Call', enabled: true, action: 'BUY', type: 'CALL', strike: callBuyStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, callBuyStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly',
    category: 'Volatility / Neutral',
    sentiment: 'Income',
    displayCategory: 'Neutral',
    sparklineType: 'iron-butterfly',
    description: 'Sell ATM straddle and buy OTM strangle wings for tight range-bound high-premium capture.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const atmStrike = roundToStrike(env.spotPrice, step);
      const wingDist = step * 3;
      const lowerStrike = atmStrike - wingDist;
      const upperStrike = atmStrike + wingDist;
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Buy Lower Wing Put', enabled: true, action: 'BUY', type: 'PUT', strike: lowerStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, lowerStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Sell ATM Put', enabled: true, action: 'SELL', type: 'PUT', strike: atmStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, atmStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-3', name: 'Sell ATM Call', enabled: true, action: 'SELL', type: 'CALL', strike: atmStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-4', name: 'Buy Upper Wing Call', enabled: true, action: 'BUY', type: 'CALL', strike: upperStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, upperStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'calendar-spread',
    name: 'Calendar Spread',
    category: 'Volatility / Neutral',
    sentiment: 'Neutral',
    displayCategory: 'Neutral',
    sparklineType: 'calendar-spread',
    isCalendarModal: true,
    calendarType: 'calendar',
    description: 'Sell near-term ATM option and buy far-term ATM option at same strike to profit from theta decay differences.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const atmStrike = roundToStrike(env.spotPrice, step);
      const nearExpiry = customExpiry || getExpiryDate(env.baseDate, 7);
      const farExpiry = getExpiryDate(env.baseDate, 28);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;
      const pNear = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, nearExpiry, env.globalIV, env.interestRate);
      const pFar = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, farExpiry, env.globalIV, env.interestRate);

      return [
        {
          id: `leg-cal-${Date.now()}-1`,
          name: `Sell Near ATM Call`,
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: atmStrike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNear
        },
        {
          id: `leg-cal-${Date.now()}-2`,
          name: `Buy Far ATM Call`,
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: atmStrike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFar
        }
      ];
    }
  },
  {
    id: 'double-calendar-spread',
    name: 'Double Calendar Spread',
    category: 'Volatility / Neutral',
    sentiment: 'Neutral',
    displayCategory: 'Neutral',
    sparklineType: 'double-calendar-spread',
    isCalendarModal: true,
    calendarType: 'double-calendar',
    description: 'Sell near ATM Call & Put, buy far ATM Call & Put. Market-neutral strategy profiting from time decay and rising IV.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const atmStrike = roundToStrike(env.spotPrice, step);
      const nearExpiry = customExpiry || getExpiryDate(env.baseDate, 7);
      const farExpiry = getExpiryDate(env.baseDate, 28);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      const pNearCall = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, nearExpiry, env.globalIV, env.interestRate);
      const pNearPut = getLegPremium(env.spotPrice, atmStrike, 'PUT', env.baseDate, nearExpiry, env.globalIV, env.interestRate);
      const pFarCall = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, farExpiry, env.globalIV, env.interestRate);
      const pFarPut = getLegPremium(env.spotPrice, atmStrike, 'PUT', env.baseDate, farExpiry, env.globalIV, env.interestRate);

      return [
        {
          id: `leg-dcal-${Date.now()}-1`,
          name: `Sell Near ATM Call`,
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: atmStrike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNearCall
        },
        {
          id: `leg-dcal-${Date.now()}-2`,
          name: `Sell Near ATM Put`,
          enabled: true,
          action: 'SELL',
          type: 'PUT',
          strike: atmStrike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNearPut
        },
        {
          id: `leg-dcal-${Date.now()}-3`,
          name: `Buy Far ATM Call`,
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: atmStrike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFarCall
        },
        {
          id: `leg-dcal-${Date.now()}-4`,
          name: `Buy Far ATM Put`,
          enabled: true,
          action: 'BUY',
          type: 'PUT',
          strike: atmStrike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFarPut
        }
      ];
    }
  },
  {
    id: 'triple-calendar-spread',
    name: 'Triple Calendar Spread',
    category: 'Volatility / Neutral',
    sentiment: 'Neutral',
    displayCategory: 'Neutral',
    sparklineType: 'triple-calendar-spread',
    isCalendarModal: true,
    calendarType: 'triple-calendar',
    description: 'Uses three expiries (near, mid, far) to fine-tune time decay: Sell near, Buy mid, Sell far ATM options.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const atmStrike = roundToStrike(env.spotPrice, step);
      const nearExpiry = customExpiry || getExpiryDate(env.baseDate, 7);
      const midExpiry = getExpiryDate(env.baseDate, 14);
      const farExpiry = getExpiryDate(env.baseDate, 28);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      const pNear = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, nearExpiry, env.globalIV, env.interestRate);
      const pMid = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, midExpiry, env.globalIV, env.interestRate);
      const pFar = getLegPremium(env.spotPrice, atmStrike, 'CALL', env.baseDate, farExpiry, env.globalIV, env.interestRate);

      return [
        {
          id: `leg-tcal-${Date.now()}-1`,
          name: `Sell Near ATM Call`,
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: atmStrike,
          expiry: nearExpiry,
          lotSize,
          lots: 1,
          entryPrice: pNear
        },
        {
          id: `leg-tcal-${Date.now()}-2`,
          name: `Buy Mid ATM Call`,
          enabled: true,
          action: 'BUY',
          type: 'CALL',
          strike: atmStrike,
          expiry: midExpiry,
          lotSize,
          lots: 1,
          entryPrice: pMid
        },
        {
          id: `leg-tcal-${Date.now()}-3`,
          name: `Sell Far ATM Call`,
          enabled: true,
          action: 'SELL',
          type: 'CALL',
          strike: atmStrike,
          expiry: farExpiry,
          lotSize,
          lots: 1,
          entryPrice: pFar
        }
      ];
    }
  },

  // ==========================================
  // OTHERS (Volatility / Hedging)
  // ==========================================
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    category: 'Volatility / Neutral',
    sentiment: 'High Volatility',
    displayCategory: 'Others',
    sparklineType: 'long-straddle',
    description: 'Buy ATM Call and Put for massive breakout moves in either direction.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const strike = roundToStrike(env.spotPrice, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Long ATM Call', enabled: true, action: 'BUY', type: 'CALL', strike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, strike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Long ATM Put', enabled: true, action: 'BUY', type: 'PUT', strike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, strike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    category: 'Volatility / Neutral',
    sentiment: 'High Volatility',
    displayCategory: 'Others',
    sparklineType: 'long-strangle',
    description: 'Buy OTM Call and Put at lower entry premium, profiting from explosive volatility spikes.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const pStrike = roundToStrike(env.spotPrice * 0.97, step);
      const cStrike = roundToStrike(env.spotPrice * 1.03, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 14);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Long OTM Put', enabled: true, action: 'BUY', type: 'PUT', strike: pStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, pStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) },
        { id: 'leg-2', name: 'Long OTM Call', enabled: true, action: 'BUY', type: 'CALL', strike: cStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, cStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    category: 'Single',
    sentiment: 'Income',
    displayCategory: 'Others',
    sparklineType: 'covered-call',
    description: 'Long equity or future combined with short OTM call to generate consistent monthly yield.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const otmStrike = roundToStrike(env.spotPrice * 1.03, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 21);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Long Underlying', enabled: true, action: 'BUY', type: 'FUTURE', strike: env.spotPrice, expiry, lotSize, lots: 1, entryPrice: env.spotPrice },
        { id: 'leg-2', name: 'Short OTM Call', enabled: true, action: 'SELL', type: 'CALL', strike: otmStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, otmStrike, 'CALL', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  },
  {
    id: 'protective-put',
    name: 'Protective Put',
    category: 'Single',
    sentiment: 'Bullish',
    displayCategory: 'Others',
    sparklineType: 'protective-put',
    description: 'Long asset combined with long OTM put to lock in a guaranteed floor under potential losses.',
    createLegs: (env, customExpiry) => {
      const step = getStrikeStep(env.spotPrice);
      const putStrike = roundToStrike(env.spotPrice * 0.96, step);
      const expiry = customExpiry || getExpiryDate(env.baseDate, 30);
      const lotSize = env.symbol.includes('NIFTY') ? 50 : 100;

      return [
        { id: 'leg-1', name: 'Long Underlying', enabled: true, action: 'BUY', type: 'FUTURE', strike: env.spotPrice, expiry, lotSize, lots: 1, entryPrice: env.spotPrice },
        { id: 'leg-2', name: 'Long Floor Put', enabled: true, action: 'BUY', type: 'PUT', strike: putStrike, expiry, lotSize, lots: 1, entryPrice: getLegPremium(env.spotPrice, putStrike, 'PUT', env.baseDate, expiry, env.globalIV, env.interestRate) }
      ];
    }
  }
];
