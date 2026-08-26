/**
 * Deterministic narrative report, composed purely from a `DatasetProfile`.
 *
 * This is the product's floor: when the LLM is unavailable (free-tier 429,
 * network error, or no key), the report route returns this instead — same
 * `Report` shape, `source: "fallback"`, badged in the UI. It also doubles as a
 * stable snapshot-test target, so it must stay deterministic (no dates, no RNG,
 * no locale-dependent formatting).
 */

import { fmtInt, fmtNum, fmtPct } from "@/lib/format";
import type {
  CategoricalStats,
  DatasetProfile,
  DatetimeStats,
  NumericStats,
  Report,
} from "@/lib/types";

/** "a" | "a and b" | "a, b, and c" */
function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function typeSummary(profile: DatasetProfile): string {
  const tb = profile.typeBreakdown;
  const parts: string[] = [];
  const push = (n: number, singular: string) => {
    if (n > 0) parts.push(`${n} ${singular}${n === 1 ? "" : "s"}`);
  };
  push(tb.numeric + tb.integer, "numeric column");
  push(tb.categorical, "categorical column");
  push(tb.datetime, "date/time column");
  push(tb.boolean, "boolean column");
  push(tb.id, "identifier column");
  push(tb.text, "free-text column");
  return joinList(parts);
}

export function buildFallbackReport(profile: DatasetProfile): Report {
  const numeric = profile.columns.filter(
    (c): c is NumericStats => c.type === "numeric" || c.type === "integer",
  );
  const categorical = profile.columns.filter(
    (c): c is CategoricalStats => c.type === "categorical",
  );
  const dateCol = profile.columns.find(
    (c): c is DatetimeStats => c.type === "datetime" && c.name === profile.datetimeIndex,
  );

  // --- Overview ---
  const overviewParts = [
    `This dataset contains ${fmtInt(profile.rowCount)} rows across ${fmtInt(
      profile.columnCount,
    )} columns (${typeSummary(profile)}).`,
  ];
  if (dateCol) {
    overviewParts.push(
      `It reads as a time series indexed by "${dateCol.name}" at ${dateCol.granularity} granularity.`,
    );
  }

  // --- Shape & trends ---
  const shapeParts: string[] = [];
  const bySpread = [...numeric].sort((a, b) => b.std - a.std).slice(0, 3);
  for (const c of bySpread) {
    shapeParts.push(
      `"${c.name}" ranges ${fmtNum(c.min)}–${fmtNum(c.max)} (median ${fmtNum(c.median)}).`,
    );
  }
  const skewed = numeric.find((c) => Math.abs(c.skew) >= 1);
  if (skewed) {
    shapeParts.push(
      `"${skewed.name}" is ${skewed.skew > 0 ? "right" : "left"}-skewed (skew ${fmtNum(
        skewed.skew,
      )}), so its mean and median differ.`,
    );
  }
  const topPair = profile.correlation.strongPairs[0];
  if (topPair) {
    shapeParts.push(
      `The strongest relationship is between "${topPair.a}" and "${topPair.b}" (r = ${fmtNum(
        topPair.r,
      )}).`,
    );
  }
  if (shapeParts.length === 0) {
    shapeParts.push("No numeric columns were available to summarize distributions.");
  }

  // --- Data quality ---
  const q = profile.quality;
  const qualityParts = [`Overall data-quality score: ${q.score}/100 (grade ${q.grade}).`];
  if (q.missingCellsPct > 0) {
    qualityParts.push(`${fmtPct(q.missingCellsPct)} of all cells are missing.`);
  }
  if (q.duplicateRows > 0) {
    qualityParts.push(
      `${fmtInt(q.duplicateRows)} duplicate rows (${fmtPct(q.duplicateRowsPct)}).`,
    );
  }
  if (q.highNullColumns.length > 0) {
    qualityParts.push(`Mostly-empty columns: ${joinList(q.highNullColumns)}.`);
  }
  if (q.constantColumns.length > 0) {
    qualityParts.push(`Constant (single-value) columns: ${joinList(q.constantColumns)}.`);
  }
  if (q.mixedTypeColumns.length > 0) {
    qualityParts.push(`Mixed-type columns worth cleaning: ${joinList(q.mixedTypeColumns)}.`);
  }
  if (qualityParts.length === 1) {
    qualityParts.push("No major quality issues were detected.");
  }

  // --- Anomalies ---
  const anomalies = profile.anomalies;
  const anomalyParts: string[] = [];
  if (anomalies.length === 0) {
    anomalyParts.push(
      "No statistical anomalies were flagged by the robust detectors (MAD z-score and IQR fences).",
    );
  } else {
    const cols = new Set(anomalies.map((a) => a.column));
    const usedTimewise = anomalies.some((a) => a.method === "timewise");
    anomalyParts.push(
      `${fmtInt(anomalies.length)} anomal${anomalies.length === 1 ? "y" : "ies"} flagged across ${
        cols.size
      } column${cols.size === 1 ? "" : "s"} using robust methods${
        usedTimewise ? ", including time-aware rolling detection" : ""
      }.`,
    );
    for (const a of anomalies.slice(0, 3)) {
      anomalyParts.push(
        `In "${a.column}", a value of ${fmtNum(a.value)} stands out (${a.direction}, ${
          a.band
        } severity${a.corroborated ? ", corroborated by both methods" : ""}).`,
      );
    }
  }

  // --- Key findings ---
  const keyFindings: string[] = [];
  keyFindings.push(
    `${fmtInt(profile.rowCount)} rows × ${fmtInt(profile.columnCount)} columns; quality grade ${q.grade} (${q.score}/100).`,
  );
  if (topPair) {
    keyFindings.push(
      `"${topPair.a}" and "${topPair.b}" are strongly correlated (r = ${fmtNum(topPair.r)}).`,
    );
  }
  const topAnomaly = anomalies[0];
  if (topAnomaly) {
    keyFindings.push(
      `Most extreme value: ${fmtNum(topAnomaly.value)} in "${topAnomaly.column}".`,
    );
  }
  if (q.missingCellsPct > 0.05) {
    keyFindings.push(`Missing data is notable at ${fmtPct(q.missingCellsPct)} of cells.`);
  }
  const highCard = categorical.find((c) => c.highCardinality);
  if (highCard) {
    keyFindings.push(
      `"${highCard.name}" has high cardinality (${fmtInt(highCard.cardinality)} distinct values).`,
    );
  }

  // --- Suggested questions ---
  const suggested: string[] = [];
  const firstNumeric = numeric[0];
  if (dateCol && firstNumeric) {
    suggested.push(`What is the overall trend in ${firstNumeric.name} over time?`);
  }
  if (firstNumeric) {
    suggested.push(`Which rows have the highest ${firstNumeric.name}?`);
  }
  if (firstNumeric && categorical[0]) {
    suggested.push(`How does ${firstNumeric.name} differ across ${categorical[0].name}?`);
  }
  if (topPair) {
    suggested.push(`Why might ${topPair.a} and ${topPair.b} be related?`);
  }
  if (topAnomaly) {
    suggested.push(`What could explain the outlier in ${topAnomaly.column}?`);
  }
  if (q.highNullColumns[0]) {
    suggested.push(`Why is ${q.highNullColumns[0]} missing so many values?`);
  }
  if (suggested.length === 0) {
    suggested.push("What are the most common values in each column?");
  }

  return {
    title: dateCol
      ? `Time-series profile (${fmtInt(profile.rowCount)} rows)`
      : `Dataset profile (${fmtInt(profile.rowCount)} rows, ${fmtInt(profile.columnCount)} columns)`,
    datasetOverview: overviewParts.join(" "),
    shapeAndTrends: shapeParts.join(" "),
    dataQualityNotes: qualityParts.join(" "),
    anomalyNotes: anomalyParts.join(" "),
    keyFindings,
    suggestedQuestions: suggested.slice(0, 6),
    source: "fallback",
  };
}
