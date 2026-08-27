/**
 * Compact, privacy-preserving summary of a `DatasetProfile`.
 *
 * This is the ONLY thing sent to `/api/insights`. It contains aggregate
 * statistics only — never raw rows, never free-text cell values. Numbers are
 * rounded so the payload is small and its hash is stable across environments
 * (the report cache keys on `hashObject(summary)`).
 *
 * What we deliberately include vs. omit for privacy:
 *   - numeric  → min/max/mean/median/std/skew (aggregates)
 *   - categorical → cardinality/mode + top values with shares (standard profile)
 *   - datetime → start/end/granularity/gaps
 *   - boolean  → true share
 *   - text     → avg length + distinct count ONLY (no example values)
 *   - id       → distinct count only
 *   - anomalies → the extreme value + method/band, but NOT its row index
 */

import type {
  AnomalyBand,
  AnomalyMethod,
  ColumnProfile,
  ColumnType,
  DatasetProfile,
} from "@/lib/types";

/** Round to `d` decimals; non-finite → 0 so the payload stays JSON-clean. */
function round(n: number, d = 4): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export interface ColumnSummary {
  name: string;
  type: ColumnType;
  /** fraction of rows missing, 0..1 */
  missingPct: number;
  /** distinct value count (categorical / id / text) */
  distinct?: number;
  // numeric
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  skew?: number;
  // categorical
  mode?: string;
  top?: { value: string; pct: number }[];
  highCardinality?: boolean;
  // datetime
  start?: string;
  end?: string;
  granularity?: string;
  gaps?: number;
  // boolean
  truePct?: number;
  // text
  avgLength?: number;
}

export interface AnomalySummary {
  column: string;
  value: number;
  method: AnomalyMethod;
  band: AnomalyBand;
  direction: "up" | "down";
  corroborated: boolean;
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  typeBreakdown: Record<ColumnType, number>;
  datetimeIndex?: string;
  columns: ColumnSummary[];
  quality: {
    score: number;
    grade: string;
    missingCellsPct: number;
    duplicateRows: number;
    duplicateRowsPct: number;
    constantColumns: string[];
    highNullColumns: string[];
    mixedTypeColumns: string[];
    issues: { label: string; penalty: number }[];
  };
  anomalies: AnomalySummary[];
  strongPairs: { a: string; b: string; r: number }[];
}

function summarizeColumn(col: ColumnProfile): ColumnSummary {
  const base: ColumnSummary = {
    name: col.name,
    type: col.type,
    missingPct: round(col.missingPct),
  };

  switch (col.type) {
    case "numeric":
    case "integer":
      return {
        ...base,
        min: round(col.min),
        max: round(col.max),
        mean: round(col.mean),
        median: round(col.median),
        std: round(col.std),
        skew: round(col.skew, 3),
      };
    case "categorical":
      return {
        ...base,
        distinct: col.cardinality,
        mode: col.mode,
        highCardinality: col.highCardinality,
        // top values are aggregates ("most common"), not row-level data
        top: col.topK.slice(0, 5).map((t) => ({ value: t.value, pct: round(t.pct) })),
      };
    case "datetime":
      return {
        ...base,
        start: col.min,
        end: col.max,
        granularity: col.granularity,
        gaps: col.gaps,
      };
    case "boolean":
      return { ...base, truePct: round(col.truePct) };
    case "text":
      // avg length + distinct only — never the actual strings (may be PII)
      return { ...base, distinct: col.unique, avgLength: round(col.avgLength, 1) };
    case "id":
      return { ...base, distinct: col.unique };
  }
}

/** Build the compact, shareable summary. Pure and deterministic. */
export function summarizeProfile(profile: DatasetProfile): DatasetSummary {
  const q = profile.quality;
  const summary: DatasetSummary = {
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    typeBreakdown: profile.typeBreakdown,
    columns: profile.columns.map(summarizeColumn),
    quality: {
      score: q.score,
      grade: q.grade,
      missingCellsPct: round(q.missingCellsPct),
      duplicateRows: q.duplicateRows,
      duplicateRowsPct: round(q.duplicateRowsPct),
      constantColumns: q.constantColumns,
      highNullColumns: q.highNullColumns,
      mixedTypeColumns: q.mixedTypeColumns,
      issues: q.components.map((c) => ({ label: c.label, penalty: c.penalty })),
    },
    anomalies: profile.anomalies.slice(0, 12).map((a) => ({
      column: a.column,
      value: round(a.value),
      method: a.method,
      band: a.band,
      direction: a.direction,
      corroborated: a.corroborated,
    })),
    strongPairs: profile.correlation.strongPairs
      .slice(0, 10)
      .map((p) => ({ a: p.a, b: p.b, r: round(p.r, 3) })),
  };
  if (profile.datetimeIndex !== undefined) summary.datetimeIndex = profile.datetimeIndex;
  return summary;
}
