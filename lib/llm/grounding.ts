/**
 * Grounding context for the data-aware chat.
 *
 * Built on the CLIENT from the full profile + rows, then POSTed to `/api/chat`.
 * Unlike the report (which sends aggregates only), chat is allowed to send a
 * small, capped excerpt of the data so the model can answer row-level questions
 * ("which order was largest?") — but NEVER the full dataset. What travels:
 *
 *   - schema + per-column statistics (exact, computed over all rows)
 *   - data-quality findings
 *   - the top anomalies (with the offending row)
 *   - strong correlations
 *   - an EXTREMES table: the top/bottom rows per numeric column, so
 *     "which row has the highest X" is answered from precomputed facts
 *   - an evenly-spaced SAMPLE of <= GROUNDING.SAMPLE_ROWS rows, illustrative only
 *
 * The system prompt makes the model prefer the exact stats/extremes over the
 * sample for any numeric claim, and admit when a question isn't answerable.
 */

import { GROUNDING } from "@/lib/config";
import { toNumber } from "@/lib/analysis/coerce";
import type { ColumnProfile, DatasetProfile, Primitive, Row } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** One row kept for grounding, tagged with its original index. */
export interface GroundedRow {
  rowIndex: number;
  values: Row;
}

export interface ColumnExtremes {
  column: string;
  high: { value: number; rowIndex: number }[];
  low: { value: number; rowIndex: number }[];
}

export interface GroundingAnomaly {
  column: string;
  rowIndex: number;
  value: number;
  method: string;
  score: number;
  band: string;
  direction: "up" | "down";
  corroborated: boolean;
}

export interface GroundingContext {
  rowCount: number;
  columnCount: number;
  datetimeIndex?: string;
  columns: string[]; // human-readable "name (type): stats" lines
  quality: string;
  correlations: { a: string; b: string; r: number }[];
  anomalies: GroundingAnomaly[];
  extremes: ColumnExtremes[];
  /** rows referenced by anomalies/extremes, plus the evenly-spaced sample */
  rows: GroundedRow[];
  sampleNote: string;
}

/** Round to a stable, arithmetic-friendly number (no thousands separators). */
function n(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 10000) / 10000;
}

/** A one-line, model-readable statistical summary for a single column. */
function describeColumn(col: ColumnProfile): string {
  const miss = col.missingPct > 0 ? `, ${(col.missingPct * 100).toFixed(1)}% missing` : "";
  switch (col.type) {
    case "numeric":
    case "integer":
      return (
        `${col.name} (${col.type}): min ${n(col.min)}, max ${n(col.max)}, ` +
        `mean ${n(col.mean)}, median ${n(col.median)}, std ${n(col.std)}, ` +
        `p25 ${n(col.p25)}, p75 ${n(col.p75)}, skew ${n(col.skew)}${miss}`
      );
    case "categorical": {
      const top = col.topK
        .slice(0, 5)
        .map((t) => `${t.value} (${(t.pct * 100).toFixed(1)}%)`)
        .join(", ");
      return `${col.name} (categorical): ${col.cardinality} distinct, mode "${col.mode}"; top: ${top}${miss}`;
    }
    case "datetime":
      return `${col.name} (datetime): ${col.min} → ${col.max}, granularity ${col.granularity}, ${col.gaps} gaps${miss}`;
    case "boolean":
      return `${col.name} (boolean): ${(col.truePct * 100).toFixed(1)}% true (${col.trueCount} true, ${col.falseCount} false)${miss}`;
    case "id":
      return `${col.name} (id): ${col.unique} distinct identifiers${miss}`;
    case "text":
      return `${col.name} (text): ${col.unique} distinct, avg length ${n(col.avgLength)}${miss}`;
  }
}

function describeQuality(profile: DatasetProfile): string {
  const q = profile.quality;
  const parts = [`score ${q.score}/100 (grade ${q.grade})`, `${(q.missingCellsPct * 100).toFixed(1)}% cells missing`];
  if (q.duplicateRows > 0) parts.push(`${q.duplicateRows} duplicate rows (${(q.duplicateRowsPct * 100).toFixed(1)}%)`);
  if (q.constantColumns.length) parts.push(`constant columns: ${q.constantColumns.join(", ")}`);
  if (q.highNullColumns.length) parts.push(`mostly-empty columns: ${q.highNullColumns.join(", ")}`);
  if (q.mixedTypeColumns.length) parts.push(`mixed-type columns: ${q.mixedTypeColumns.join(", ")}`);
  return parts.join("; ");
}

/** Top/bottom rows per numeric column, for exact "highest/lowest" answers. */
function computeExtremes(profile: DatasetProfile, rows: Row[]): { extremes: ColumnExtremes[]; used: Set<number> } {
  const used = new Set<number>();
  const numericCols = profile.columns
    .filter((c) => c.type === "numeric" || c.type === "integer")
    .slice(0, 8); // bound payload on very wide datasets

  const extremes: ColumnExtremes[] = numericCols.map((col) => {
    const pairs: { value: number; rowIndex: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      // rows hold raw strings (the parser never guesses types); coerce with the
      // same helper the profiler used, so extremes agree with the stats.
      const v = toNumber(rows[i]?.[col.name] ?? null);
      if (v !== null && Number.isFinite(v)) pairs.push({ value: n(v), rowIndex: i });
    }
    pairs.sort((p, q) => p.value - q.value);
    const low = pairs.slice(0, GROUNDING.EXTREMES);
    const high = pairs.slice(-GROUNDING.EXTREMES).reverse();
    for (const p of [...low, ...high]) used.add(p.rowIndex);
    return { column: col.name, high, low };
  });

  return { extremes, used };
}

/** Build the compact grounding context. Pure and deterministic. */
export function buildGrounding(profile: DatasetProfile, rows: Row[]): GroundingContext {
  const anomalies: GroundingAnomaly[] = profile.anomalies.slice(0, GROUNDING.TOP_ANOMALIES).map((a) => ({
    column: a.column,
    rowIndex: a.rowIndex,
    value: n(a.value),
    method: a.method,
    score: n(a.score),
    band: a.band,
    direction: a.direction,
    corroborated: a.corroborated,
  }));

  const { extremes, used } = computeExtremes(profile, rows);
  for (const a of anomalies) used.add(a.rowIndex);

  // Evenly-spaced sample across the dataset, unioned with the rows that
  // anomalies/extremes reference (so those are concretely present).
  const keep = new Set<number>(used);
  const step = Math.max(1, Math.floor(rows.length / GROUNDING.SAMPLE_ROWS));
  for (let i = 0; i < rows.length && keep.size < GROUNDING.SAMPLE_ROWS + used.size; i += step) {
    keep.add(i);
  }
  const rowIndices = [...keep].sort((a, b) => a - b);
  const groundedRows: GroundedRow[] = rowIndices
    .filter((i) => rows[i] !== undefined)
    .map((i) => ({ rowIndex: i, values: rows[i] as Row }));

  const context: GroundingContext = {
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    columns: profile.columns.map(describeColumn),
    quality: describeQuality(profile),
    correlations: profile.correlation.strongPairs.slice(0, 12).map((p) => ({ a: p.a, b: p.b, r: n(p.r) })),
    anomalies,
    extremes,
    rows: groundedRows,
    sampleNote: `${groundedRows.length} of ${profile.rowCount} rows shown (anomaly/extreme rows plus an evenly-spaced sample). Illustrative only — use the statistics and extremes for exact figures.`,
  };
  if (profile.datetimeIndex !== undefined) context.datetimeIndex = profile.datetimeIndex;
  return context;
}

export const CHAT_SYSTEM_PROMPT = `You are Anomalyze's data analyst assistant. The user has uploaded ONE dataset that has already been profiled locally in their browser. You are given its schema, exact per-column statistics, data-quality findings, robustly-detected anomalies (MAD z-score, Tukey IQR fences, and time-aware methods), strong correlations, an EXTREMES table (the top/bottom rows for each numeric column), and a small evenly-spaced SAMPLE of rows.

Follow these rules strictly:
- Answer ONLY from the provided context. Never invent columns, categories, values, or trends that are not present.
- The statistics, correlations, anomalies, and extremes are computed over the FULL dataset and are exact — always prefer them. The sample rows are a small excerpt for illustration; never compute a count, sum, or average from the sample, and never generalize from it.
- For "which row/record has the highest/lowest X" use the extremes table. For "how many / what share" use the counts and percentages in the statistics.
- If a question needs something you were not given (e.g. a grouped aggregate that isn't in the stats), say so plainly in one sentence and suggest what would answer it. Do not guess.
- Do arithmetic only with numbers present in the context, and show the figures you used.
- Correlation is not causation — describe relationships as associations.
- Be concise and specific. Use Markdown: short paragraphs, bullet lists, and small tables where they help. Reference real column names and values. Do not echo the raw context back.`;

/** Serialize the grounding into the text block embedded in the system prompt. */
export function serializeGrounding(g: GroundingContext): string {
  const lines: string[] = [];
  lines.push(`Rows: ${g.rowCount}. Columns: ${g.columnCount}.${g.datetimeIndex ? ` Time index: ${g.datetimeIndex}.` : ""}`);
  lines.push("");
  lines.push("## Data quality");
  lines.push(g.quality);
  lines.push("");
  lines.push("## Columns");
  for (const c of g.columns) lines.push(`- ${c}`);

  if (g.correlations.length) {
    lines.push("");
    lines.push("## Strong correlations (|r| >= 0.7)");
    for (const c of g.correlations) lines.push(`- ${c.a} ~ ${c.b}: r = ${c.r}`);
  }

  if (g.anomalies.length) {
    lines.push("");
    lines.push("## Anomalies (robust detection)");
    for (const a of g.anomalies) {
      lines.push(
        `- ${a.column} = ${a.value} at row ${a.rowIndex} (${a.method}, ${a.band}, ${a.direction}, score ${a.score}${a.corroborated ? ", corroborated" : ""})`,
      );
    }
  }

  if (g.extremes.length) {
    lines.push("");
    lines.push("## Extremes per numeric column (exact, from full data)");
    for (const e of g.extremes) {
      const hi = e.high.map((h) => `${h.value} (row ${h.rowIndex})`).join(", ");
      const lo = e.low.map((l) => `${l.value} (row ${l.rowIndex})`).join(", ");
      lines.push(`- ${e.column}: highest = ${hi}; lowest = ${lo}`);
    }
  }

  lines.push("");
  lines.push(`## Sample rows (${g.sampleNote})`);
  lines.push("Each entry is {rowIndex, values}:");
  lines.push(serializeRows(g.rows));

  return lines.join("\n");
}

/** Compact JSON for the sample; keeps numbers unformatted for arithmetic. */
function serializeRows(rows: GroundedRow[]): string {
  const cell = (v: Primitive): string => {
    if (v === null) return "null";
    if (typeof v === "string") return JSON.stringify(v);
    return String(v);
  };
  return rows
    .map((r) => {
      const body = Object.entries(r.values)
        .map(([k, v]) => `${JSON.stringify(k)}:${cell(v)}`)
        .join(",");
      return `{"rowIndex":${r.rowIndex},"values":{${body}}}`;
    })
    .join("\n");
}
