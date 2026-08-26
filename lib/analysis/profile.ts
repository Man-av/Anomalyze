/**
 * Dataset profiling orchestrator.
 *
 * `profileDataset` is the single entry point the UI, chart selector, report API,
 * and chat all build on. It profiles every column, picks a time index if the
 * data has one, then runs anomaly detection, correlation, and quality scoring.
 * Pure and deterministic — no I/O, no LLM, no randomness — so the whole product
 * works at zero API budget and the output is snapshot-testable.
 */

import type {
  ColumnProfile,
  ColumnType,
  DatasetProfile,
  DatetimeStats,
  Row,
} from "@/lib/types";
import { detectAnomalies } from "@/lib/analysis/anomalies";
import { computeCorrelation } from "@/lib/analysis/correlation";
import { computeQuality } from "@/lib/analysis/quality";
import { profileColumn } from "@/lib/analysis/profileColumn";

/** Column names in first-seen order, unioned across rows to tolerate ragged input. */
function columnOrder(rows: Row[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    }
  }
  return order;
}

/** Use the datetime column with the most parseable values as the time index. */
function pickDatetimeIndex(columns: ColumnProfile[]): string | undefined {
  const dt = columns.filter((c): c is DatetimeStats => c.type === "datetime");
  if (dt.length === 0) return undefined;
  let best = dt[0]!;
  for (const c of dt) if (c.count > best.count) best = c;
  return best.name;
}

const EMPTY_BREAKDOWN: Record<ColumnType, number> = {
  integer: 0,
  numeric: 0,
  boolean: 0,
  datetime: 0,
  categorical: 0,
  id: 0,
  text: 0,
};

export function profileDataset(rows: Row[]): DatasetProfile {
  const names = columnOrder(rows);
  const columns: ColumnProfile[] = names.map((name) =>
    profileColumn(
      name,
      rows.map((r) => r[name] ?? null),
    ),
  );

  const datetimeIndex = pickDatetimeIndex(columns);
  const anomalies = detectAnomalies(columns, rows, datetimeIndex);
  const correlation = computeCorrelation(columns, rows);
  const quality = computeQuality(columns, rows);

  const typeBreakdown: Record<ColumnType, number> = { ...EMPTY_BREAKDOWN };
  for (const c of columns) typeBreakdown[c.type] += 1;

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    anomalies,
    correlation,
    quality,
    typeBreakdown,
    ...(datetimeIndex ? { datetimeIndex } : {}),
  };
}
