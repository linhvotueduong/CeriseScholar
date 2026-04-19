import type { StudyEffect, PooledResult } from "@/types/meta-analysis";

export const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

export function stdDev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

export function correlation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  const sx = stdDev(x.slice(0, n)), sy = stdDev(y.slice(0, n));
  if (sx === 0 || sy === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (x[i] - mx) * (y[i] - my);
  return sum / ((n - 1) * sx * sy);
}

export function tTest(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b), sa = stdDev(a), sb = stdDev(b);
  const se = Math.sqrt(sa ** 2 / a.length + sb ** 2 / b.length);
  const t = (ma - mb) / se;
  const df = a.length + b.length - 2;
  return { t, df, meanDiff: ma - mb, se, cohensD: (ma - mb) / Math.sqrt((sa ** 2 + sb ** 2) / 2) };
}

export function cohensD(m1: number, m2: number, s1: number, s2: number, n1: number, n2: number) {
  const pooledSD = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
  const d = (m1 - m2) / pooledSD;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)));
  return { d, se, ci_lower: d - 1.96 * se, ci_upper: d + 1.96 * se };
}

export function hedgesG(d: number, n1: number, n2: number) {
  const df = n1 + n2 - 2;
  const c = 1 - 3 / (4 * df - 1);
  const g = d * c;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + g ** 2 / (2 * (n1 + n2))) * c;
  return { g, se, ci_lower: g - 1.96 * se, ci_upper: g + 1.96 * se };
}

// Log odds ratio from binary events
export function logOddsRatio(e1: number, n1: number, e2: number, n2: number) {
  // Haldane-Anscombe correction for zero cells
  const a = e1 === 0 || e2 === 0 || e1 === n1 || e2 === n2 ? 0.5 : 0;
  const x1 = e1 + a, y1 = n1 - e1 + a;
  const x2 = e2 + a, y2 = n2 - e2 + a;
  const logOR = Math.log((x1 * y2) / (y1 * x2));
  const se = Math.sqrt(1 / x1 + 1 / y1 + 1 / x2 + 1 / y2);
  return { logOR, se, ci_lower: logOR - 1.96 * se, ci_upper: logOR + 1.96 * se };
}

// Normal CDF (Abramowitz & Stegun approximation)
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

// Two-tailed p from chi-square (Q, df) via Wilson-Hilferty
export function chiSquarePValue(Q: number, df: number) {
  if (df <= 0 || Q <= 0) return 1;
  const z = Math.sqrt(9 * df / 2) * (Math.cbrt(Q / df) - 1 + 2 / (9 * df));
  return 1 - normalCdf(z);
}

// Two-tailed p from z
export function twoTailedP(z: number) {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

export type MetaMethod = "random" | "fixed";

/**
 * Pool effects using fixed-effect (inverse variance) or random-effects (DerSimonian-Laird).
 */
export function poolEffects(effects: { effect: number; se: number }[], method: MetaMethod = "random"): PooledResult {
  const k = effects.length;
  if (k === 0) {
    return { effect: 0, se: 0, ci: [0, 0], Q: 0, df: 0, I2: 0, pValue: 1, tau2: 0 };
  }
  const wFixed = effects.map(e => 1 / (e.se * e.se));
  const twFixed = wFixed.reduce((a, b) => a + b, 0);
  const fixedEffect = wFixed.reduce((s, w, i) => s + w * effects[i].effect, 0) / twFixed;
  const Q = wFixed.reduce((s, w, i) => s + w * (effects[i].effect - fixedEffect) ** 2, 0);
  const df = k - 1;
  const I2 = df > 0 ? Math.max(0, (Q - df) / Q * 100) : 0;

  // DerSimonian-Laird tau^2
  const sumWsq = wFixed.reduce((a, b) => a + b * b, 0);
  const tau2 = df > 0 ? Math.max(0, (Q - df) / (twFixed - sumWsq / twFixed)) : 0;

  const weights = method === "fixed"
    ? wFixed
    : effects.map((_, i) => 1 / (1 / wFixed[i] + tau2));
  const tw = weights.reduce((a, b) => a + b, 0);
  const pooledEffect = weights.reduce((s, w, i) => s + w * effects[i].effect, 0) / tw;
  const pooledSE = Math.sqrt(1 / tw);
  const ci: [number, number] = [pooledEffect - 1.96 * pooledSE, pooledEffect + 1.96 * pooledSE];
  const pValue = twoTailedP(pooledEffect / pooledSE);

  return { effect: pooledEffect, se: pooledSE, ci, Q, df, I2, pValue, tau2 };
}

/** Study-level weights (percentage) for a given method. */
export function studyWeights(effects: { effect: number; se: number }[], method: MetaMethod = "random"): number[] {
  const pooled = poolEffects(effects, method);
  const raw = method === "fixed"
    ? effects.map(e => 1 / (e.se * e.se))
    : effects.map(e => 1 / (e.se * e.se + pooled.tau2));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => (w / sum) * 100);
}

/**
 * Leave-one-out influence analysis.
 * Returns the pooled effect if each study is dropped.
 */
export function leaveOneOut(effects: { effect: number; se: number }[], method: MetaMethod = "random") {
  return effects.map((_, i) => {
    const rest = effects.filter((_, j) => j !== i);
    return poolEffects(rest, method);
  });
}

/**
 * Baujat plot coordinates.
 * x = squared contribution to Q;
 * y = standardized change in pooled effect when study is removed.
 */
export function baujatCoords(effects: { effect: number; se: number }[], method: MetaMethod = "random") {
  const pooled = poolEffects(effects, method);
  const loo = leaveOneOut(effects, method);
  return effects.map((e, i) => {
    const w = 1 / (e.se * e.se);
    const x = w * (e.effect - pooled.effect) ** 2;
    const dropped = loo[i];
    const y = Math.abs(pooled.effect - dropped.effect) / pooled.se;
    return { x, y };
  });
}

/** Cumulative pooled effect — one study added at a time. */
export function cumulativeMeta(effects: { effect: number; se: number; name: string }[], method: MetaMethod = "random") {
  return effects.map((_, i) => {
    const slice = effects.slice(0, i + 1);
    const pooled = poolEffects(slice, method);
    return { upTo: effects[i].name, ...pooled };
  });
}
