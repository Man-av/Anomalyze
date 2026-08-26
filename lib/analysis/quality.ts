/**
 * Data-quality scoring. Produces a transparent 0–100 score with a per-component
 * breakdown, so the UI can show *why* the score is what it is rather than a
 * black-box number. Every penalty is bounded so no single issue tanks the score.
 */

import { QUALITY } from "@/lib/config";
import type {
  ColumnProfile,
  QualityComponent,
  QualityGrade,
  QualityReport,
  Row,
} from "@/lib/types";
import { isBlank, toDate, toNumber } from "@/lib/analysis/coerce";

function gradeFor(score: number): QualityGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Count exact-duplicate rows (repeats of an earlier identical row). */
function countDuplicateRows(rows: Row[], names: string[]): number {
  const seen = new Set<string>();
  let dups = 0;
  for (const row of rows) {
    // Stable key over columns in profile order; JSON keeps types distinct.
    const key = JSON.stringify(names.map((n) => row[n] ?? null));
    if (seen.has(key)) dups += 1;
    else seen.add(key);
  }
  return dups;
}

/**
 * Fraction of a column's non-null values that coerce to a number or date.
 * A middling fraction on a categorical/text column signals mixed content
 * (e.g. numbers interleaved with "N/A", "unknown").
 */
function coercibleFraction(rows: Row[], name: string): number {
  let nonNull = 0;
  let coercible = 0;
  for (const row of rows) {
    const v = row[name] ?? null;
    if (isBlank(v)) continue;
    nonNull += 1;
    if (toNumber(v) !== null || toDate(v) !== null) coercible += 1;
  }
  return nonNull === 0 ? 0 : coercible / nonNull;
}

export function computeQuality(
  columns: ColumnProfile[],
  rows: Row[],
): QualityReport {
  const rowCount = rows.length;
  const columnCount = columns.length;
  const names = columns.map((c) => c.name);

  const totalCells = rowCount * columnCount;
  const missingCells = columns.reduce((acc, c) => acc + c.missing, 0);
  const missingCellsPct = totalCells === 0 ? 0 : missingCells / totalCells;

  const duplicateRows = countDuplicateRows(rows, names);
  const duplicateRowsPct = rowCount === 0 ? 0 : duplicateRows / rowCount;

  const constantColumns = columns.filter((c) => c.constant).map((c) => c.name);
  const highNullColumns = columns
    .filter((c) => c.missingPct > QUALITY.HIGH_NULL_PCT)
    .map((c) => c.name);
  const mixedTypeColumns = columns
    .filter((c) => c.type === "categorical" || c.type === "text")
    .filter((c) => {
      const f = coercibleFraction(rows, c.name);
      return f >= QUALITY.MIXED_LO && f <= QUALITY.MIXED_HI;
    })
    .map((c) => c.name);

  const components: QualityComponent[] = [];
  const add = (label: string, penalty: number) => {
    if (penalty > 0) components.push({ label, penalty: Math.round(penalty) });
  };

  add(
    "Missing values",
    Math.min(QUALITY.MISSING_CAP, QUALITY.MISSING_WEIGHT * missingCellsPct * 100),
  );
  add(
    "Duplicate rows",
    Math.min(QUALITY.DUP_CAP, QUALITY.DUP_WEIGHT * duplicateRowsPct * 100),
  );
  add(
    "Constant columns",
    Math.min(QUALITY.CONSTANT_CAP, QUALITY.CONSTANT_EACH * constantColumns.length),
  );
  add(
    "Mostly-empty columns",
    Math.min(QUALITY.HIGHNULL_CAP, QUALITY.HIGHNULL_EACH * highNullColumns.length),
  );
  add(
    "Mixed-type columns",
    Math.min(QUALITY.MIXED_CAP, QUALITY.MIXED_EACH * mixedTypeColumns.length),
  );

  const totalPenalty = components.reduce((acc, c) => acc + c.penalty, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  return {
    score,
    grade: gradeFor(score),
    missingCellsPct,
    duplicateRows,
    duplicateRowsPct,
    constantColumns,
    highNullColumns,
    mixedTypeColumns,
    components,
  };
}
