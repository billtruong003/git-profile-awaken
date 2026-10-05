import type { StatCode } from '../domain/types.js';

/**
 * How one stat is spread across active GitHub players: a share of exact zeros, and log(1 + value) of the
 * rest modelled as a normal distribution. The model keeps the far tail (top 0.05%) usable from a few
 * thousand samples, where an empirical table would have one or two points.
 */
export interface StatDistribution {
  zero: number;
  mu: number;
  sigma: number;
}

export interface Population {
  sampledAt: string;
  size: number;
  stats: Record<StatCode, StatDistribution>;
  /** Composite score (mean z) at every 0.5 percentile (201 points), for the overall rank. */
  composite: number[];
}

/** Rank boundaries as the share of active players below: E under 40%, D from 40%, … EX from 99.95%. */
export const LADDER = [0.4, 0.6, 0.75, 0.87, 0.94, 0.98, 0.995, 0.9995] as const;

export const WEIGHTS: Record<StatCode, number> = { STR: 2, AGI: 1.5, INT: 1, VIT: 1, LUK: 1.5, CHA: 1 };

// Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf) and its inverse (Acklam).
const erf = (x: number): number => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
export const normalCdf = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

export const normalInv = (p: number): number => {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > 1 - lo) return -normalInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
};

/** Share of active players with a lower value. Zero sits at the bottom. */
export const percentileOf = (value: number, d: StatDistribution): number =>
  value <= 0 ? 0 : d.zero + (1 - d.zero) * normalCdf((Math.log1p(value) - d.mu) / d.sigma);

/** The smallest value that reaches percentile `p`. */
export const valueAt = (p: number, d: StatDistribution): number => {
  if (p <= d.zero) return 1;
  return Math.max(1, Math.ceil(Math.expm1(d.mu + d.sigma * normalInv((p - d.zero) / (1 - d.zero)))));
};

/**
 * Weighted mean of the six stats as normal scores (z = Φ⁻¹(percentile)). Averaging raw percentiles caps every
 * outstanding stat at 1, so someone far ahead in four stats scored like someone barely ahead; z-scores keep
 * the distance. Percentiles are clamped so a zero or a record value cannot dominate the mean.
 */
export const compositeScore = (percentiles: Record<StatCode, number>): number => {
  let sum = 0;
  let weight = 0;
  for (const [code, w] of Object.entries(WEIGHTS) as [StatCode, number][]) {
    sum += normalInv(Math.min(0.99995, Math.max(0.0005, percentiles[code]))) * w;
    weight += w;
  }
  return sum / weight;
};

/** Where a composite score falls among sampled players, interpolated between the stored quantiles. */
export const compositePercentile = (score: number, quantiles: number[]): number => {
  const n = quantiles.length - 1;
  if (score <= quantiles[0]!) return 0;
  if (score >= quantiles[n]!) {
    // Beyond the best sampled player: continue the upper tail as a normal curve fitted to the top decile.
    const p90 = quantiles[Math.round(n * 0.9)]!;
    const spread = Math.max(1e-6, (quantiles[n]! - p90) / (normalInv(1 - 0.5 / n) - normalInv(0.9)));
    return Math.min(0.99999, normalCdf(normalInv(1 - 0.5 / n) + (score - quantiles[n]!) / spread));
  }
  for (let i = 1; i <= n; i++) {
    if (score < quantiles[i]!) {
      const lo = quantiles[i - 1]!;
      const t = (score - lo) / Math.max(1e-12, quantiles[i]! - lo);
      return (i - 1 + t) / n;
    }
  }
  return 1;
};
