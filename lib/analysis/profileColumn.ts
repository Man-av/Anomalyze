/**
 * Per-column profiling: turns a column's raw values into a typed `ColumnProfile`
 * with type-appropriate statistics. Type inference decides the branch; each
 * branch computes only the stats that make sense for that type.
 */

import { CHART, INFER } from "@/lib/config";
import type {
  BooleanStats,
  CategoricalStats,
  CategoryCount,
  ColumnBase,
  ColumnProfile,
  DatetimeStats,
  Granularity,
  NumericStats,
  Primitive,
  TextStats,
} from "@/lib/types";
import { isBlank, toBoolean, toDate, toNumber } from "@/lib/analysis/coerce";
import { inferColumnType } from "@/lib/analysis/inferType";
import {
  histogramBins,
  mean,
  median,
  quantile,
  shannonEntropy,
  skewness,
  sortedAsc,
  std,
  valueCounts,
} from "@/lib/analysis/stats";

type BaseNoType = Omit<ColumnBase, "type">;

function computeBase(values: Primitive[]): BaseNoType {
  const total = values.length;
  const nonNull = values.filter((v) => !isBlank(v));
  const count = nonNull.length;
  const missing = total - count;
  const unique = new Set(nonNull.map((v) => String(v))).size;
  return {
    name: "", // filled by caller
    count,
    missing,
    missingPct: total === 0 ? 0 : missing / total,
    unique,
    uniqueRatio: count === 0 ? 0 : unique / count,
    constant: unique <= 1,
  };
}

/** Canonical calendar units in ms, ascending, for granularity detection. */
const UNITS: readonly [Granularity, number][] = [
  ["second", 1_000],
  ["minute", 60_000],
  ["hour", 3_600_000],
  ["day", 86_400_000],
  ["month", 2_629_746_000], // average Gregorian month
  ["year", 31_556_952_000], // average Gregorian year
];

function inferGranularity(times: number[]): { granularity: Granularity; gaps: number } {
  const uniq = [...new Set(times)].sort((a, b) => a - b);
  if (uniq.length < 2) return { granularity: "irregular", gaps: 0 };

  const diffs: number[] = [];
  for (let i = 1; i < uniq.length; i++) diffs.push(uniq[i]! - uniq[i - 1]!);
  const med = median(diffs);
  if (med <= 0) return { granularity: "irregular", gaps: 0 };

  // Nearest unit in log space; if the gap is >~65% off any unit, it's irregular.
  let best: Granularity = "irregular";
  let bestErr = Infinity;
  let bestUnit = med;
  for (const [g, u] of UNITS) {
    const err = Math.abs(Math.log(med / u));
    if (err < bestErr) {
      bestErr = err;
      best = g;
      bestUnit = u;
    }
  }
  if (bestErr > 0.5) return { granularity: "irregular", gaps: 0 };

  const span = uniq[uniq.length - 1]! - uniq[0]!;
  const expected = Math.round(span / bestUnit) + 1;
  const gaps = Math.max(0, expected - uniq.length);
  return { granularity: best, gaps };
}

function numericProfile(base: BaseNoType, nums: number[]): NumericStats {
  const asc = sortedAsc(nums);
  const mu = mean(nums);
  const p25 = quantile(asc, 0.25);
  const p50 = quantile(asc, 0.5);
  const p75 = quantile(asc, 0.75);
  const allInt = nums.every((n) => Number.isInteger(n));
  return {
    ...base,
    type: allInt ? "integer" : "numeric",
    mean: mu,
    median: p50,
    std: std(nums, mu),
    min: asc[0]!,
    max: asc[asc.length - 1]!,
    p25,
    p50,
    p75,
    iqr: p75 - p25,
    skew: skewness(nums, mu),
    histogram: histogramBins(nums),
  };
}

function categoricalProfile(base: BaseNoType, strs: string[]): CategoricalStats {
  const counts = valueCounts(strs);
  const total = strs.length;
  const entries = [...counts.entries()];
  const topK: CategoryCount[] = entries.slice(0, CHART.TOP_K).map(([value, count]) => ({
    value,
    count,
    pct: total === 0 ? 0 : count / total,
  }));
  if (entries.length > CHART.TOP_K) {
    const rest = entries.slice(CHART.TOP_K).reduce((acc, [, c]) => acc + c, 0);
    topK.push({ value: "Other", count: rest, pct: total === 0 ? 0 : rest / total });
  }
  const firstKey = counts.keys().next();
  return {
    ...base,
    type: "categorical",
    mode: firstKey.done ? "" : firstKey.value,
    cardinality: counts.size,
    entropy: shannonEntropy([...counts.values()]),
    highCardinality: counts.size > INFER.HIGH_CARD,
    topK,
  };
}

function datetimeProfile(base: BaseNoType, dates: Date[]): DatetimeStats {
  const times = dates.map((d) => d.getTime()).sort((a, b) => a - b);
  const minT = times[0]!;
  const maxT = times[times.length - 1]!;
  const { granularity, gaps } = inferGranularity(times);
  return {
    ...base,
    type: "datetime",
    min: new Date(minT).toISOString(),
    max: new Date(maxT).toISOString(),
    rangeMs: maxT - minT,
    granularity,
    gaps,
  };
}

function booleanProfile(base: BaseNoType, bools: boolean[]): BooleanStats {
  const trueCount = bools.filter((b) => b).length;
  const falseCount = bools.length - trueCount;
  return {
    ...base,
    type: "boolean",
    trueCount,
    falseCount,
    truePct: bools.length === 0 ? 0 : trueCount / bools.length,
  };
}

function textProfile(base: BaseNoType, strs: string[]): TextStats {
  const seen: string[] = [];
  for (const s of strs) {
    if (!seen.includes(s)) seen.push(s);
    if (seen.length >= 5) break;
  }
  return {
    ...base,
    type: "text",
    avgLength: strs.length === 0 ? 0 : mean(strs.map((s) => s.length)),
    sampleValues: seen,
  };
}

export function profileColumn(name: string, values: Primitive[]): ColumnProfile {
  const base = { ...computeBase(values), name };
  const nonNull = values.filter((v) => !isBlank(v));
  const type = inferColumnType(name, values);

  switch (type) {
    case "numeric":
    case "integer": {
      const nums = nonNull.map(toNumber).filter((n): n is number => n !== null);
      // Degrade to text if nothing actually parses (guards tiny/edge columns).
      if (nums.length === 0) return textProfile(base, nonNull.map(String));
      return numericProfile(base, nums);
    }
    case "datetime": {
      const dates = nonNull.map(toDate).filter((d): d is Date => d !== null);
      if (dates.length === 0) return textProfile(base, nonNull.map(String));
      return datetimeProfile(base, dates);
    }
    case "boolean": {
      const bools = nonNull.map(toBoolean).filter((b): b is boolean => b !== null);
      return booleanProfile(base, bools);
    }
    case "categorical":
      return categoricalProfile(base, nonNull.map(String));
    case "id":
      return { ...base, type: "id" };
    default:
      return textProfile(base, nonNull.map(String));
  }
}
