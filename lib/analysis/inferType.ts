/**
 * Column type inference. Classifies a column as one of the seven `ColumnType`s
 * using first-match-wins heuristics over a sample of its non-null values.
 * Thresholds live in lib/config.ts.
 */

import { INFER } from "@/lib/config";
import type { ColumnType, Primitive } from "@/lib/types";
import { isBlank, toBoolean, toDate, toNumber } from "@/lib/analysis/coerce";
import { mean } from "@/lib/analysis/stats";

const ID_NAME = /^id$|_id$|(^|_)(uuid|guid)($|_)|(^|_)(code|key)$/i;

function isIdName(name: string): boolean {
  return ID_NAME.test(name.trim());
}

function isMonotonic(nums: number[]): boolean {
  if (nums.length < 3) return false;
  let inc = true;
  let dec = true;
  for (let i = 1; i < nums.length; i++) {
    const prev = nums[i - 1]!;
    const cur = nums[i]!;
    if (cur <= prev) inc = false;
    if (cur >= prev) dec = false;
  }
  return inc || dec;
}

/** Deterministic systematic sample (every k-th element) — no RNG, test-stable. */
function sampleValues<T>(values: T[], size: number): T[] {
  if (values.length <= size) return values;
  const step = values.length / size;
  const out: T[] = [];
  for (let i = 0; i < size; i++) out.push(values[Math.floor(i * step)]!);
  return out;
}

export function inferColumnType(name: string, values: Primitive[]): ColumnType {
  const nonNull = values.filter((v) => !isBlank(v));
  if (nonNull.length === 0) return "text";

  const sample = sampleValues(nonNull, INFER.SAMPLE_SIZE);
  const distinct = new Set(sample.map((v) => String(v)));
  const uniqueRatio = distinct.size / sample.length;

  // 1) Boolean — small distinct set that all parse as booleans.
  if (distinct.size <= 2 && sample.every((v) => toBoolean(v) !== null)) {
    return "boolean";
  }

  // 2) Datetime — most values parse against the strict format table.
  const dateHits = sample.filter((v) => toDate(v) !== null).length;
  if (dateHits / sample.length >= INFER.DATE_PARSE_RATIO) return "datetime";

  // 3) Numeric — most values coerce to finite numbers.
  const nums = sample.map(toNumber).filter((n): n is number => n !== null);
  if (nums.length / sample.length >= INFER.NUMERIC_RATIO) {
    const allInt = nums.every((n) => Number.isInteger(n));
    if (
      allInt &&
      uniqueRatio >= INFER.ID_UNIQUE_RATIO &&
      (isIdName(name) || isMonotonic(nums))
    ) {
      return "id";
    }
    return allInt ? "integer" : "numeric";
  }

  // 4) String id — near-unique tokens with an id-ish name (or fully unique).
  if (uniqueRatio >= INFER.ID_UNIQUE_RATIO && (isIdName(name) || uniqueRatio === 1)) {
    return "id";
  }

  // 5) Categorical vs free text — by cardinality and average length.
  const catCeiling = Math.max(INFER.CAT_ABS, INFER.CAT_FRAC * sample.length);
  const avgLen = mean(sample.map((v) => String(v).length));
  if (distinct.size <= catCeiling || (uniqueRatio < 0.5 && avgLen < INFER.TEXT_LEN)) {
    return "categorical";
  }
  return "text";
}
