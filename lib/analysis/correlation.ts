/**
 * Pearson correlation across numeric columns.
 *
 * Uses pairwise-complete observations (a row contributes to a pair only when
 * both values are present), so missing data in one column doesn't discard rows
 * from unrelated pairs. Constant columns are excluded — their correlation is
 * undefined (0/0) and would just be noise. `id`-typed columns are already
 * filtered out upstream since they aren't `numeric`/`integer`.
 */

import { CORRELATION } from "@/lib/config";
import type {
  ColumnProfile,
  CorrelationPair,
  CorrelationResult,
  Row,
} from "@/lib/types";
import { toNumber } from "@/lib/analysis/coerce";

/** Pearson r over rows where both series are non-null. */
function pearson(x: (number | null)[], y: (number | null)[]): number {
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i]!;
    const b = y[i]!;
    if (a === null || b === null) continue;
    n += 1;
    sx += a;
    sy += b;
    sxx += a * a;
    syy += b * b;
    sxy += a * b;
  }
  if (n < CORRELATION.MIN_PAIRS) return 0;
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  const denom = Math.sqrt(vx * vy);
  if (denom === 0) return 0;
  // Clamp against floating-point drift just outside [-1, 1].
  return Math.max(-1, Math.min(1, cov / denom));
}

export function computeCorrelation(
  columns: ColumnProfile[],
  rows: Row[],
): CorrelationResult {
  const numeric = columns.filter(
    (c) => (c.type === "numeric" || c.type === "integer") && !c.constant,
  );
  const names = numeric.map((c) => c.name);
  const k = names.length;

  // Pre-extract each column as an aligned numeric array (null where missing).
  const series: (number | null)[][] = names.map((name) =>
    rows.map((r) => toNumber(r[name] ?? null)),
  );

  const matrix: number[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)),
  );
  const strongPairs: CorrelationPair[] = [];

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const r = pearson(series[i]!, series[j]!);
      matrix[i]![j] = r;
      matrix[j]![i] = r;
      if (Math.abs(r) >= CORRELATION.STRONG_R) {
        strongPairs.push({ a: names[i]!, b: names[j]!, r });
      }
    }
  }
  strongPairs.sort((p, q) => Math.abs(q.r) - Math.abs(p.r));

  return { columns: names, matrix, strongPairs };
}
