export type OptionAction = 'BUY' | 'SELL';
export type OptionType = 'CALL' | 'PUT' | 'FUTURE';

export interface OptionLeg {
  id: string;
  name?: string;
  enabled: boolean;
  action: OptionAction;
  type: OptionType;
  strike: number;
  expiry: string; // YYYY-MM-DD
  lotSize: number;
  lots: number;
  entryPrice: number; // Entry premium per unit
  ivOverride?: number | null; // In percentage, e.g., 18.5 for 18.5%
}

export interface MarketEnvironment {
  symbol: string;
  spotPrice: number;
  changePercent?: number; // e.g. 2.01 for +2.01%
  globalIV: number; // In percentage, e.g., 15 for 15%
  interestRate: number; // In percentage, e.g., 6.5 for 6.5%
  currency: '₹' | '$';
  baseDate: string; // Today's date YYYY-MM-DD
}

export interface ManualPnLEntry {
  enabled: boolean;
  amount: number;
  description?: string;
}

export interface WhatIfParameters {
  targetDate: string; // YYYY-MM-DD
  targetSpot: number;
  targetIVShift: number; // Percentage shift, e.g., +2 or -3
}

export interface LegGreeks {
  delta: number;
  gamma: number;
  theta: number; // 1-day theta in currency
  vega: number;  // 1% IV change in currency
  rho: number;   // 1% rate change in currency
}

export interface LegValuation {
  legId: string;
  currentValue: number; // Theoretical value at T+0 per unit
  targetValue: number;  // Theoretical value at Target Date & Price per unit
  expiryValue: number;  // Intrinsic payoff per unit
  targetPnL: number;    // Net P&L at target in total currency (taking lots*lotSize into account)
  expiryPnL: number;    // Net P&L at expiry in total currency
  thetaDecayPnL: number;// P&L portion attributed strictly to time passage
  greeks: LegGreeks;    // Total Greeks for this leg (scaled by lots*lotSize*direction)
}

export interface PositionMetrics {
  netDebitCredit: number; // Negative = Debit (Paid), Positive = Credit (Received)
  maxProfit: number | 'Unlimited';
  maxLoss: number | 'Unlimited';
  riskRewardRatio: string;
  breakevens: number[];
  probabilityOfProfit: number; // Approximate POP in %
  netDelta: number;
  netGamma: number;
  netTheta: number; // Daily portfolio decay
  netVega: number;  // Portfolio Vega per 1% IV shift
  netRho: number;
  totalTargetPnL: number;
  totalExpiryPnL: number;
  totalThetaDecay: number;
}

export interface PayoffDataPoint {
  spot: number;
  currentPnL: number; // T+0 curve
  targetPnL: number;  // Target Date curve
  expiryPnL: number;  // At-Expiry curve
}

export interface SavedStrategy {
  id: string;
  name: string;
  description?: string;
  savedAt: number;
  environment: MarketEnvironment;
  legs: OptionLeg[];
}

export type AlertCondition = 'ABOVE_OR_EQUAL' | 'BELOW_OR_EQUAL' | 'EXACT';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  note?: string;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}
