/**
 * Robust anomaly detection.
 *
 * Why not plain 3σ? The mean and standard deviation are themselves dragged
 * toward the outliers you're trying to find, and they assume a bell curve. We
 * use methods that resist that:
 *
 *   - MAD robust z-score (Iglewicz–Hoaglin): 0.6745·(x − median)/MAD. The median
 *     and MAD have a ~50% breakdown point, so a few wild values don't move them.
 *   - Tukey IQR fences: outside [Q1 − 1.5·IQR, Q3 + 1.5·IQR]. Distribution-free.
 *     Agreement between MAD and IQR raises confidence (`corroborated`).
 *   - Time-aware (when a datetime index exists): a centered rolling median/MAD,
 *     so a point is judged against its local neighborhood — catching spikes and
 *     level shifts a global method would miss on trending/seasonal series.
 *
 * Guardrails prevent flooding: heavy-tailed columns raise their own bar, and
 * results are capped per-column and globally, ranked by severity.
 */

import { ANOMALY } from "@/lib/config";
import type { Anomaly, AnomalyBand, ColumnProfile, Row } from "@/lib/types";
import { toDate, toNumber } from "@/lib/analysis/coerce";
import { clamp, mad, mean, median, quantile, sortedAsc } from "@/lib/analysis/stats";

interface Pair {
  value: number;
  rowIndex: number;
}

function bandFor(score: number): AnomalyBand {
  if (score >= ANOMALY.BAND_HIGH) return "high";
  if (score >= ANOMALY.BAND_MED) return "medium";
  return "low";
}

function numericPairs(rows: Row[], name: string): Pair[] {
  const out: Pair[] = [];
  for (let i = 0; i < rows.length; i++) {
    const n = toNumber(rows[i]![name] ?? null);
    if (n !== null) out.push({ value: n, rowIndex: i });
  }
  return out;
}

/** Static robust detector: MAD z-score (primary) corroborated by IQR fences. */
function detectStatic(pairs: Pair[], column: string): Anomaly[] {
  const values = pairs.map((p) => p.value);
  const n = values.length;
  if (n < 4) return [];

  const med = median(values);
  const rawMad = mad(values, med);
  const asc = sortedAsc(values);
  const q1 = quantile(asc, 0.25);
  const q3 = quantile(asc, 0.75);
  const iqr = q3 - q1;

  // Scale factor for the robust z. Fall back to mean-absolute-deviation when
  // MAD is 0 (happens when >50% of values are identical).
  let scale = rawMad;
  let factor = 0.6745;
  if (scale === 0) {
    scale = mean(values.map((v) => Math.abs(v - med)));
    factor = 0.7979;
  }
  const canMad = scale > 0;

  const out: Anomaly[] = [];
  for (const p of pairs) {
    const madZ = canMad ? (factor * (p.value - med)) / scale : 0;
    const flaggedMad = canMad && Math.abs(madZ) >= ANOMALY.MAD_Z;

    let iqrFlagged = false;
    let iqrScore = 0;
    if (iqr > 0) {
      const mildLo = q1 - ANOMALY.IQR_MILD * iqr;
      const mildHi = q3 + ANOMALY.IQR_MILD * iqr;
      if (p.value < mildLo || p.value > mildHi) {
        iqrFlagged = true;
        const dist = p.value > mildHi ? p.value - mildHi : mildLo - p.value;
        // Map distance-beyond-fence onto a z-like scale (~2.7 at the mild fence).
        iqrScore = 2.7 + (2 * dist) / iqr;
      }
    }

    if (!flaggedMad && !iqrFlagged) continue;

    const score = flaggedMad ? Math.abs(madZ) : iqrScore;
    out.push({
      column,
      rowIndex: p.rowIndex,
      value: p.value,
      method: flaggedMad ? "mad" : "iqr",
      score,
      band: bandFor(score),
      direction: p.value >= med ? "up" : "down",
      corroborated: flaggedMad && iqrFlagged,
    });
  }
  return out;
}

/** Time-aware detector: centered rolling median/MAD against the local window. */
function detectTimewise(rows: Row[], column: string, dateCol: string): Anomaly[] {
  const series: { value: number; rowIndex: number; t: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const v = toNumber(row[column] ?? null);
    const d = toDate(row[dateCol] ?? null);
    if (v !== null && d !== null) {
      series.push({ value: v, rowIndex: i, t: d.getTime() });
    }
  }
  const n = series.length;
  // Too short for a meaningful rolling window — fall back to the static method.
  if (n < 8) {
    return detectStatic(
      series.map((s) => ({ value: s.value, rowIndex: s.rowIndex })),
      column,
    );
  }
  series.sort((a, b) => a.t - b.t);

  let w = clamp(Math.round(ANOMALY.ROLL_FRAC * n), ANOMALY.ROLL_MIN, ANOMALY.ROLL_MAX);
  if (w % 2 === 0) w += 1;
  const h = Math.floor(w / 2);

  const out: Anomaly[] = [];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - h);
    const hi = Math.min(n - 1, i + h);
    const windowVals: number[] = [];
    for (let j = lo; j <= hi; j++) windowVals.push(series[j]!.value);
    const wm = median(windowVals);
    const wmad = mad(windowVals, wm);
    if (wmad <= 0) continue;
    const z = (0.6745 * (series[i]!.value - wm)) / wmad;
    if (Math.abs(z) >= ANOMALY.MAD_Z) {
      const score = Math.abs(z);
      out.push({
        column,
        rowIndex: series[i]!.rowIndex,
        value: series[i]!.value,
        method: "timewise",
        score,
        band: bandFor(score),
        direction: series[i]!.value >= wm ? "up" : "down",
        corroborated: false,
      });
    }
  }
  return out;
}

export function detectAnomalies(
  columns: ColumnProfile[],
  rows: Row[],
  datetimeIndex?: string,
): Anomaly[] {
  const numericCols = columns.filter(
    (c) => c.type === "numeric" || c.type === "integer",
  );

  const all: Anomaly[] = [];
  for (const col of numericCols) {
    let found =
      datetimeIndex && col.name !== datetimeIndex
        ? detectTimewise(rows, col.name, datetimeIndex)
        : detectStatic(numericPairs(rows, col.name), col.name);

    found.sort((a, b) => b.score - a.score);

    // Heavy-tailed guard: if a column flags more than FLAG_RATE_CAP of its rows,
    // its distribution isn't outlier-sparse — raise the bar to only the extreme.
    if (found.length > ANOMALY.FLAG_RATE_CAP * col.count) {
      found = found.filter((a) => a.band === "high");
    }
    all.push(...found.slice(0, ANOMALY.MAX_PER_COL));
  }

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, ANOMALY.MAX_STORE);
}
