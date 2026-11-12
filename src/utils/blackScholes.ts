import { MarketEnvironment, OptionLeg, PositionMetrics, WhatIfParameters, LegValuation, PayoffDataPoint, LegGreeks } from '../types/options';

// High-precision Standard Normal PDF: phi(x)
export function standardNormalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// High-precision Cumulative Normal Distribution Function N(x) using Abramowitz & Stegun 7.1.26
// Absolute error < 7.5e-8
export function standardNormalCdf(x: number): number {
  if (isNaN(x)) return 0.5;
  if (x > 8.0) return 1.0;
  if (x < -8.0) return 0.0;

  const isNegative = x < 0;
  const absX = Math.abs(x);

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const cdf = 1.0 - standardNormalPdf(absX) * poly;

  return isNegative ? 1.0 - cdf : cdf;
}

// Convert date difference to time in years (act/365)
export function getTimeToExpiryInYears(currentDateStr: string, expiryDateStr: string): number {
  const current = new Date(currentDateStr).getTime();
  const expiry = new Date(expiryDateStr).getTime();
  const diffDays = Math.max(0, (expiry - current) / (1000 * 60 * 60 * 24));
  return Math.max(0.0001 / 365, diffDays / 365.25);
}

export interface BsmCalculationResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // 1-day theta
  vega: number;  // 1% IV shift
  rho: number;   // 1% rate shift
}

/**
 * Core Black-Scholes-Merton Pricing Engine
 * @param S Current or Target Spot Price
 * @param K Strike Price
 * @param T Time to expiry in years
 * @param r Risk-free interest rate (as decimal, e.g. 0.065 for 6.5%)
 * @param sigma Implied Volatility (as decimal, e.g. 0.18 for 18%)
 * @param type 'CALL' | 'PUT' | 'FUTURE'
 */
export function calculateBSM(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'CALL' | 'PUT' | 'FUTURE'
): BsmCalculationResult {
  // Edge case handling
  if (S <= 0 || K <= 0) {
    return { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  // Handle Future/Underlying contract
  if (type === 'FUTURE') {
    const futurePrice = S * Math.exp(r * T);
    return {
      price: futurePrice,
      delta: 1.0,
      gamma: 0.0,
      theta: -(r * S) / 365.25,
      vega: 0.0,
      rho: (K * T) / 100
    };
  }

  // Handle near or at expiry (T <= 0.0002 years, ~2 hours)
  if (T <= 0.0005) {
    if (type === 'CALL') {
      const intrinsic = Math.max(0, S - K);
      const delta = S > K ? 1.0 : (S === K ? 0.5 : 0.0);
      return { price: intrinsic, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
    } else {
      const intrinsic = Math.max(0, K - S);
      const delta = S < K ? -1.0 : (S === K ? -0.5 : 0.0);
      return { price: intrinsic, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }
  }

  const safeSigma = Math.max(0.0001, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * safeSigma * safeSigma) * T) / (safeSigma * sqrtT);
  const d2 = d1 - safeSigma * sqrtT;

  const pdfD1 = standardNormalPdf(d1);
  const discountFactor = Math.exp(-r * T);

  if (type === 'CALL') {
    const cdfD1 = standardNormalCdf(d1);
    const cdfD2 = standardNormalCdf(d2);
    const price = Math.max(0, S * cdfD1 - K * discountFactor * cdfD2);
    const delta = cdfD1;
    const gamma = pdfD1 / (S * safeSigma * sqrtT);
    const vega = (S * sqrtT * pdfD1) / 100; // 1% IV shift
    const theta = (-(S * pdfD1 * safeSigma) / (2 * sqrtT) - r * K * discountFactor * cdfD2) / 365.25;
    const rho = (K * T * discountFactor * cdfD2) / 100;

    return { price, delta, gamma, theta, vega, rho };
  } else {
    const cdfNegD1 = standardNormalCdf(-d1);
    const cdfNegD2 = standardNormalCdf(-d2);
    const price = Math.max(0, K * discountFactor * cdfNegD2 - S * cdfNegD1);
    const delta = cdfNegD1 - 1.0; // Negative for puts
    const gamma = pdfD1 / (S * safeSigma * sqrtT);
    const vega = (S * sqrtT * pdfD1) / 100;
    const theta = (-(S * pdfD1 * safeSigma) / (2 * sqrtT) + r * K * discountFactor * cdfNegD2) / 365.25;
    const rho = (-K * T * discountFactor * cdfNegD2) / 100;

    return { price, delta, gamma, theta, vega, rho };
  }
}

/**
 * Calculate intrinsic payoff at expiration
 */
export function calculateExpiryIntrinsic(
  spot: number,
  strike: number,
  type: 'CALL' | 'PUT' | 'FUTURE'
): number {
  if (type === 'CALL') {
    return Math.max(0, spot - strike);
  } else if (type === 'PUT') {
    return Math.max(0, strike - spot);
  } else {
    return spot - strike;
  }
}

/**
 * Calculate deep analytics and valuations for each leg and aggregate position
 */
export function evaluatePosition(
  legs: OptionLeg[],
  env: MarketEnvironment,
  whatIf: WhatIfParameters
): {
  valuations: LegValuation[];
  metrics: PositionMetrics;
} {
  const activeLegs = legs.filter(l => l.enabled);
  const r = env.interestRate / 100;
  const baseIV = env.globalIV / 100;
  const targetShiftIV = whatIf.targetIVShift / 100;

  let netDebitCredit = 0;
  let totalTargetPnL = 0;
  let totalExpiryPnL = 0;
  let totalThetaDecay = 0;

  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let netRho = 0;

  const valuations: LegValuation[] = activeLegs.map(leg => {
    const multiplier = leg.lots * leg.lotSize;
    const direction = leg.action === 'BUY' ? 1 : -1;
    const effectiveMultiplier = multiplier * direction;

    // Premium cashflow: BUY = debit (negative), SELL = credit (positive)
    netDebitCredit += -direction * (leg.entryPrice * multiplier);

    const legIV = (leg.ivOverride !== undefined && leg.ivOverride !== null)
      ? leg.ivOverride / 100
      : baseIV;

    const targetIV = Math.max(0.01, legIV + targetShiftIV);

    // Time to expiries
    const tCurrent = getTimeToExpiryInYears(env.baseDate, leg.expiry);
    const tTarget = getTimeToExpiryInYears(whatIf.targetDate, leg.expiry);

    // Current BSM valuation (T+0 at current spot)
    const currentBsm = calculateBSM(env.spotPrice, leg.strike, tCurrent, r, legIV, leg.type);

    // Target BSM valuation (at What-If target spot, target date, and target IV)
    const targetBsm = calculateBSM(whatIf.targetSpot, leg.strike, tTarget, r, targetIV, leg.type);

    // Expiry intrinsic at target spot
    const expiryValue = calculateExpiryIntrinsic(whatIf.targetSpot, leg.strike, leg.type);

    // Theoretical price at target date but with initial spot & IV (isolating pure theta decay)
    const pureTimeDecayBsm = calculateBSM(env.spotPrice, leg.strike, tTarget, r, legIV, leg.type);
    const thetaDecayPerUnit = (pureTimeDecayBsm.price - currentBsm.price);
    const thetaDecayPnL = thetaDecayPerUnit * effectiveMultiplier;

    // Net P&L: (Current theoretical value - Entry price paid) * effectiveMultiplier
    const targetPnL = (targetBsm.price - leg.entryPrice) * effectiveMultiplier;
    const expiryPnL = (expiryValue - leg.entryPrice) * effectiveMultiplier;

    // Greeks scaled for this leg
    const legGreeks: LegGreeks = {
      delta: targetBsm.delta * effectiveMultiplier,
      gamma: targetBsm.gamma * effectiveMultiplier,
      theta: targetBsm.theta * effectiveMultiplier,
      vega: targetBsm.vega * effectiveMultiplier,
      rho: targetBsm.rho * effectiveMultiplier
    };

    totalTargetPnL += targetPnL;
    totalExpiryPnL += expiryPnL;
    totalThetaDecay += thetaDecayPnL;

    netDelta += legGreeks.delta;
    netGamma += legGreeks.gamma;
    netTheta += legGreeks.theta;
    netVega += legGreeks.vega;
    netRho += legGreeks.rho;

    return {
      legId: leg.id,
      currentValue: currentBsm.price,
      targetValue: targetBsm.price,
      expiryValue,
      targetPnL,
      expiryPnL,
      thetaDecayPnL,
      greeks: legGreeks
    };
  });

  // Calculate Breakevens, Max Profit, Max Loss by sweeping over a wide price spectrum
  const strikeValues = activeLegs.map(l => l.strike);
  const minStrike = strikeValues.length ? Math.min(...strikeValues, env.spotPrice) : env.spotPrice;
  const maxStrike = strikeValues.length ? Math.max(...strikeValues, env.spotPrice) : env.spotPrice;

  const sweepMin = Math.max(1, minStrike * 0.4);
  const sweepMax = maxStrike * 1.6;
  const steps = 300;
  const stepSize = (sweepMax - sweepMin) / steps;

  let minExpiryPnL = Infinity;
  let maxExpiryPnL = -Infinity;
  const breakevens: number[] = [];

  let prevSpot = sweepMin;
  let prevPnL = computeExpiryPnLAtSpot(activeLegs, sweepMin);

  for (let i = 1; i <= steps; i++) {
    const s = sweepMin + i * stepSize;
    const pnl = computeExpiryPnLAtSpot(activeLegs, s);

    if (pnl < minExpiryPnL) minExpiryPnL = pnl;
    if (pnl > maxExpiryPnL) maxExpiryPnL = pnl;

    // Root finding for breakeven (sign change)
    if ((prevPnL < 0 && pnl >= 0) || (prevPnL > 0 && pnl <= 0)) {
      // Linear interpolation for exact zero crossing
      const root = prevSpot + (-prevPnL / (pnl - prevPnL)) * (s - prevSpot);
      if (!breakevens.some(be => Math.abs(be - root) < stepSize * 0.5)) {
        breakevens.push(Math.round(root * 100) / 100);
      }
    }

    prevSpot = s;
    prevPnL = pnl;
  }

  // Check asymptotic boundaries at extreme low and extreme high
  const extremeLowPnL = computeExpiryPnLAtSpot(activeLegs, Math.max(0.1, env.spotPrice * 0.05));
  const extremeHighPnL = computeExpiryPnLAtSpot(activeLegs, env.spotPrice * 3.0);

  // Check if position has unbounded upside or downside
  let maxProfit: number | 'Unlimited' = Math.round(maxExpiryPnL);
  let maxLoss: number | 'Unlimited' = Math.round(minExpiryPnL);

  if (extremeHighPnL > maxExpiryPnL * 1.5 || extremeLowPnL > maxExpiryPnL * 1.5) {
    maxProfit = 'Unlimited';
  }

  if (extremeHighPnL < minExpiryPnL * 1.5 || extremeLowPnL < minExpiryPnL * 1.5) {
    maxLoss = 'Unlimited';
  }

  // Risk-Reward Ratio
  let riskRewardRatio = 'N/A';
  if (typeof maxProfit === 'number' && typeof maxLoss === 'number' && Math.abs(maxLoss) > 0.01) {
    const ratio = Math.abs(maxProfit / maxLoss).toFixed(2);
    riskRewardRatio = `1:${ratio}`;
  } else if (maxProfit === 'Unlimited' && typeof maxLoss === 'number') {
    riskRewardRatio = '1:∞';
  } else if (typeof maxProfit === 'number' && maxLoss === 'Unlimited') {
    riskRewardRatio = 'Cap:Risk';
  }

  // Approximate Probability of Profit (POP) using Black-Scholes log-normal probability
  let probabilityOfProfit = 50;
  if (activeLegs.length > 0 && breakevens.length > 0) {
    probabilityOfProfit = computeProbabilityOfProfit(env.spotPrice, breakevens, baseIV, activeLegs);
  }

  const metrics: PositionMetrics = {
    netDebitCredit,
    maxProfit,
    maxLoss,
    riskRewardRatio,
    breakevens,
    probabilityOfProfit,
    netDelta,
    netGamma,
    netTheta,
    netVega,
    netRho,
    totalTargetPnL,
    totalExpiryPnL,
    totalThetaDecay
  };

  return { valuations, metrics };
}

/**
 * Helper to compute combined position expiry P&L at any arbitrary spot price
 */
export function computeExpiryPnLAtSpot(activeLegs: OptionLeg[], spot: number): number {
  let totalPnL = 0;
  for (const leg of activeLegs) {
    const multiplier = leg.lots * leg.lotSize;
    const direction = leg.action === 'BUY' ? 1 : -1;
    const payoff = calculateExpiryIntrinsic(spot, leg.strike, leg.type);
    totalPnL += (payoff - leg.entryPrice) * multiplier * direction;
  }
  return totalPnL;
}

/**
 * Generate full continuous payoff curve dataset for visualization
 */
export function generatePayoffCurve(
  legs: OptionLeg[],
  env: MarketEnvironment,
  whatIf: WhatIfParameters,
  rangePct: number = 0.20, // default +/- 20%
  pointCount: number = 100
): PayoffDataPoint[] {
  const activeLegs = legs.filter(l => l.enabled);
  if (activeLegs.length === 0) return [];

  const centerSpot = env.spotPrice;
  const minSpot = Math.max(1, centerSpot * (1 - rangePct));
  const maxSpot = centerSpot * (1 + rangePct);
  const step = (maxSpot - minSpot) / (pointCount - 1);

  const r = env.interestRate / 100;
  const baseIV = env.globalIV / 100;
  const targetShiftIV = whatIf.targetIVShift / 100;

  const points: PayoffDataPoint[] = [];

  for (let i = 0; i < pointCount; i++) {
    const s = minSpot + i * step;

    let currentPnL = 0;
    let targetPnL = 0;
    let expiryPnL = 0;

    for (const leg of activeLegs) {
      const multiplier = leg.lots * leg.lotSize;
      const direction = leg.action === 'BUY' ? 1 : -1;
      const effectiveMultiplier = multiplier * direction;

      const legIV = (leg.ivOverride !== undefined && leg.ivOverride !== null)
        ? leg.ivOverride / 100
        : baseIV;

      const targetIV = Math.max(0.01, legIV + targetShiftIV);

      const tCurrent = getTimeToExpiryInYears(env.baseDate, leg.expiry);
      const tTarget = getTimeToExpiryInYears(whatIf.targetDate, leg.expiry);

      // Theoretical valuations at spot s
      const curBsm = calculateBSM(s, leg.strike, tCurrent, r, legIV, leg.type);
      const tgtBsm = calculateBSM(s, leg.strike, tTarget, r, targetIV, leg.type);
      const expIntrinsic = calculateExpiryIntrinsic(s, leg.strike, leg.type);

      currentPnL += (curBsm.price - leg.entryPrice) * effectiveMultiplier;
      targetPnL += (tgtBsm.price - leg.entryPrice) * effectiveMultiplier;
      expiryPnL += (expIntrinsic - leg.entryPrice) * effectiveMultiplier;
    }

    points.push({
      spot: Math.round(s * 10) / 10,
      currentPnL: Math.round(currentPnL),
      targetPnL: Math.round(targetPnL),
      expiryPnL: Math.round(expiryPnL)
    });
  }

  return points;
}

/**
 * Probability of Profit estimation via log-normal distribution integration
 */
function computeProbabilityOfProfit(
  currentSpot: number,
  breakevens: number[],
  iv: number,
  activeLegs: OptionLeg[]
): number {
  if (breakevens.length === 0) return 50;

  // Find shortest expiry among legs to calculate standard deviation of spot
  const minExpiry = activeLegs.reduce((earliest, leg) => {
    return leg.expiry < earliest ? leg.expiry : earliest;
  }, activeLegs[0].expiry);

  const T = Math.max(1 / 365, getTimeToExpiryInYears(new Date().toISOString().slice(0, 10), minExpiry));
  const stdDev = iv * Math.sqrt(T);

  // Function to get lognormal CDF for spot S: P(Spot_T <= S)
  const getCdf = (s: number) => {
    if (s <= 0) return 0;
    const d2 = (Math.log(s / currentSpot) - 0.5 * stdDev * stdDev) / stdDev;
    return standardNormalCdf(d2);
  };

  const sortedBe = [...breakevens].sort((a, b) => a - b);

  if (sortedBe.length === 1) {
    const be = sortedBe[0];
    const isBullish = computeExpiryPnLAtSpot(activeLegs, be + 10) > 0;
    if (isBullish) {
      // Profit if S > be
      const pop = (1 - getCdf(be)) * 100;
      return Math.min(99.9, Math.max(0.1, Math.round(pop * 10) / 10));
    } else {
      // Profit if S < be
      const pop = getCdf(be) * 100;
      return Math.min(99.9, Math.max(0.1, Math.round(pop * 10) / 10));
    }
  } else if (sortedBe.length >= 2) {
    const be1 = sortedBe[0];
    const be2 = sortedBe[sortedBe.length - 1];
    const midSpot = (be1 + be2) / 2;
    const isInsideProfitable = computeExpiryPnLAtSpot(activeLegs, midSpot) > 0;

    if (isInsideProfitable) {
      // Range-bound strategy (e.g. Iron Condor, Short Straddle)
      const pop = (getCdf(be2) - getCdf(be1)) * 100;
      return Math.min(99.9, Math.max(0.1, Math.round(pop * 10) / 10));
    } else {
      // Outside profitable (e.g. Long Straddle, Long Strangle)
      const pop = (getCdf(be1) + (1 - getCdf(be2))) * 100;
      return Math.min(99.9, Math.max(0.1, Math.round(pop * 10) / 10));
    }
  }

  return 50;
}
