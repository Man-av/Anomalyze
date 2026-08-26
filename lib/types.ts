/**
 * Shared type contract for the analysis engine.
 *
 * A `DatasetProfile` is the single source of truth produced by `profileDataset`
 * and consumed by every UI panel, the chart selector, the report API, and chat.
 * Keeping these types centralized is what keeps the UI, routes, and tests aligned.
 */

/** A single parsed cell. `null` means missing/blank. */
export type Primitive = string | number | boolean | null;

/** A parsed row keyed by column name. */
export type Row = Record<string, Primitive>;

/** Inferred semantic type of a column. */
export type ColumnType =
  | "integer"
  | "numeric"
  | "boolean"
  | "datetime"
  | "categorical"
  | "id"
  | "text";

/** Fields every column profile carries, regardless of type. */
export interface ColumnBase {
  name: string;
  type: ColumnType;
  /** Non-null value count. */
  count: number;
  missing: number;
  /** missing / total rows, 0..1 */
  missingPct: number;
  unique: number;
  /** unique / count, 0..1 */
  uniqueRatio: number;
  /** unique non-null values <= 1 */
  constant: boolean;
}

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export interface NumericStats extends ColumnBase {
  type: "numeric" | "integer";
  mean: number;
  median: number;
  /** sample standard deviation (n-1) */
  std: number;
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  iqr: number;
  /** Fisher-Pearson skewness; 0 when undefined */
  skew: number;
  histogram: HistogramBin[];
}

export interface CategoryCount {
  value: string;
  count: number;
  /** count / total non-null, 0..1 */
  pct: number;
}

export interface CategoricalStats extends ColumnBase {
  type: "categorical";
  mode: string;
  cardinality: number;
  /** Shannon entropy in bits */
  entropy: number;
  highCardinality: boolean;
  /** top values, capped; overflow rolled into an "Other" bucket */
  topK: CategoryCount[];
}

export type Granularity =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "irregular";

export interface DatetimeStats extends ColumnBase {
  type: "datetime";
  /** ISO strings */
  min: string;
  max: string;
  rangeMs: number;
  granularity: Granularity;
  /** count of missing steps at the detected granularity */
  gaps: number;
}

export interface BooleanStats extends ColumnBase {
  type: "boolean";
  trueCount: number;
  falseCount: number;
  /** trueCount / count, 0..1 */
  truePct: number;
}

export interface IdStats extends ColumnBase {
  type: "id";
}

export interface TextStats extends ColumnBase {
  type: "text";
  avgLength: number;
  /** up to a handful of example values, for display only */
  sampleValues: string[];
}

export type ColumnProfile =
  | NumericStats
  | CategoricalStats
  | DatetimeStats
  | BooleanStats
  | IdStats
  | TextStats;

export type AnomalyMethod = "mad" | "iqr" | "timewise";
export type AnomalyBand = "low" | "medium" | "high";

export interface Anomaly {
  column: string;
  /** index into the original Row[] */
  rowIndex: number;
  value: number;
  method: AnomalyMethod;
  /** method-normalized magnitude (robust-z, or #IQRs beyond the fence) */
  score: number;
  band: AnomalyBand;
  direction: "up" | "down";
  /** true when both MAD and IQR agreed on this point */
  corroborated: boolean;
}

export interface CorrelationPair {
  a: string;
  b: string;
  r: number;
}

export interface CorrelationResult {
  /** numeric columns in matrix order */
  columns: string[];
  /** symmetric matrix, diagonal = 1 */
  matrix: number[][];
  /** |r| >= threshold, id columns excluded, sorted by |r| desc */
  strongPairs: CorrelationPair[];
}

export interface QualityComponent {
  label: string;
  /** points subtracted from 100 */
  penalty: number;
}

export type QualityGrade = "A" | "B" | "C" | "D" | "F";

export interface QualityReport {
  score: number; // 0..100
  grade: QualityGrade;
  missingCellsPct: number;
  duplicateRows: number;
  duplicateRowsPct: number;
  constantColumns: string[];
  highNullColumns: string[]; // missingPct > 0.5
  mixedTypeColumns: string[];
  components: QualityComponent[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  anomalies: Anomaly[];
  correlation: CorrelationResult;
  quality: QualityReport;
  /** chosen datetime column used as a time index, if any */
  datetimeIndex?: string;
  typeBreakdown: Record<ColumnType, number>;
}

/** The narrative report — produced by the LLM OR the deterministic fallback. */
export interface Report {
  title: string;
  datasetOverview: string;
  shapeAndTrends: string;
  dataQualityNotes: string;
  anomalyNotes: string;
  keyFindings: string[];
  suggestedQuestions: string[];
  source: "ai" | "fallback";
}
