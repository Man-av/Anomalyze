/**
 * Pure statistical primitives. No I/O, no side effects — every function here is
 * directly unit-tested in tests/stats.test.ts. Kept deliberately small and
 * composable so the higher-level profilers read clearly.
 */

import type { HistogramBin } from "@/lib/types";

export function sum(values: number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return sum(values) / values.length;
}

/** Ascending sorted copy — never mutates the input. */
export function sortedAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/**
 * Linear-interpolation quantile (same method as numpy's default).
 * Expects an ascending-sorted array. q in [0, 1].
 */
export function quantile(asc: number[], q: number): number {
  const n = asc.length;
  if (n === 0) return NaN;
  if (n === 1) return asc[0]!;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const loVal = asc[lo]!;
  if (lo === hi) return loVal;
  const hiVal = asc[hi]!;
  return loVal + (hiVal - loVal) * (pos - lo);
}

export function median(values: number[]): number {
  return quantile(sortedAsc(values), 0.5);
}

/** Sample variance (n-1). Returns 0 for n < 2. */
export function variance(values: number[], mu = mean(values)): number {
  const n = values.length;
  if (n < 2) return 0;
  let acc = 0;
  for (const v of values) acc += (v - mu) ** 2;
  return acc / (n - 1);
}

/** Sample standard deviation (n-1). */
export function std(values: number[], mu = mean(values)): number {
  return Math.sqrt(variance(values, mu));
}

/**
 * Fisher-Pearson skewness. Returns 0 when undefined (n < 3 or zero variance).
 * Positive => right-tailed, negative => left-tailed.
 */
export function skewness(
  values: number[],
  mu = mean(values),
  sigma = std(values, mu),
): number {
  const n = values.length;
  if (n < 3 || sigma === 0) return 0;
  let acc = 0;
  for (const v of values) acc += ((v - mu) / sigma) ** 3;
  return (n / ((n - 1) * (n - 2))) * acc;
}

/** Median absolute deviation about the median (raw, un-scaled). */
export function mad(values: number[], med = median(values)): number {
  if (values.length === 0) return NaN;
  const devs = values.map((v) => Math.abs(v - med));
  return median(devs);
}

/**
 * Histogram bins using the Freedman–Diaconis rule for bin width, falling back
 * to Sturges when the IQR is zero. Bin count clamped to [1, 50].
 */
export function histogramBins(values: number[]): HistogramBin[] {
  const n = values.length;
  if (n === 0) return [];
  const asc = sortedAsc(values);
  const min = asc[0]!;
  const max = asc[n - 1]!;
  if (min === max) {
    return [{ x0: min, x1: max, count: n }];
  }

  const iqr = quantile(asc, 0.75) - quantile(asc, 0.25);
  let binCount: number;
  if (iqr > 0) {
    const width = (2 * iqr) / Math.cbrt(n); // Freedman–Diaconis
    binCount = Math.ceil((max - min) / width);
  } else {
    binCount = Math.ceil(Math.log2(n) + 1); // Sturges
  }
  binCount = Math.max(1, Math.min(50, binCount));

  const width = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));

  for (const v of asc) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1; // include the max in the last bin
    if (idx < 0) idx = 0;
    bins[idx]!.count += 1;
  }
  return bins;
}

/** Shannon entropy in bits from a list of category counts. */
export function shannonEntropy(counts: number[]): number {
  const total = sum(counts);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Ordered value counts (descending), preserving first-seen order on ties. */
export function valueCounts(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

/** Most frequent value (first on ties). Empty string when no values. */
export function mode(values: string[]): string {
  const counts = valueCounts(values);
  const first = counts.keys().next();
  return first.done ? "" : first.value;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
