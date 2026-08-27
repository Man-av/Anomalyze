/**
 * Tunable thresholds for the analysis engine, gathered in one place so the
 * behavior is easy to reason about, document, and test. Every "magic number"
 * in the engine lives here with a short justification.
 */

export const INFER = {
  /** values sampled per column when inferring type (speed cap on huge files) */
  SAMPLE_SIZE: 1000,
  /** fraction of sampled values that must parse as dates to call it datetime */
  DATE_PARSE_RATIO: 0.9,
  /** fraction that must coerce to finite numbers to call it numeric */
  NUMERIC_RATIO: 0.9,
  /** unique/count at or above this (with an id-ish name or monotonic ints) => id */
  ID_UNIQUE_RATIO: 0.95,
  /** absolute cardinality ceiling for categorical */
  CAT_ABS: 20,
  /** or a fraction of row count, whichever is larger */
  CAT_FRAC: 0.05,
  /** strings longer than this on average lean toward free `text` */
  TEXT_LEN: 40,
  /** categorical with more than this many distinct values is flagged high-cardinality */
  HIGH_CARD: 50,
} as const;

export const ANOMALY = {
  /** Iglewicz–Hoaglin robust z cutoff (0.6745 * (x - median) / MAD) */
  MAD_Z: 3.5,
  /** Tukey inner fence multiplier (mild outliers) */
  IQR_MILD: 1.5,
  /** Tukey outer fence multiplier (extreme outliers) */
  IQR_EXTREME: 3.0,
  /** band cutoffs on the robust-z / IQR-normalized score */
  BAND_MED: 5,
  BAND_HIGH: 8,
  /** if a column flags more than this fraction of rows, treat it as heavy-tailed */
  FLAG_RATE_CAP: 0.1,
  /** time-aware rolling window as a fraction of n, clamped to [MIN, MAX] */
  ROLL_FRAC: 0.1,
  ROLL_MIN: 5,
  ROLL_MAX: 51,
  /** storage / display caps to avoid flooding on large datasets */
  MAX_PER_COL: 10,
  MAX_STORE: 50,
  MAX_SHOW: 15,
} as const;

export const CORRELATION = {
  /** |r| at or above this is a "strong" pair */
  STRONG_R: 0.7,
  /** minimum overlapping rows to compute a pair */
  MIN_PAIRS: 5,
} as const;

export const QUALITY = {
  MISSING_WEIGHT: 0.4,
  MISSING_CAP: 40,
  DUP_WEIGHT: 0.5,
  DUP_CAP: 25,
  CONSTANT_EACH: 5,
  CONSTANT_CAP: 15,
  HIGHNULL_EACH: 5,
  HIGHNULL_CAP: 15,
  MIXED_EACH: 5,
  MIXED_CAP: 15,
  /** column is "high null" above this missing fraction */
  HIGH_NULL_PCT: 0.5,
  /** mixed-type: numeric/date coercion succeeds for this fraction band */
  MIXED_LO: 0.5,
  MIXED_HI: 0.9,
} as const;

export const CHART = {
  /** categorical bars beyond this roll into "Other" */
  TOP_K: 10,
  /** max charts rendered on the dashboard grid */
  MAX_CHARTS: 9,
} as const;

export const GROUNDING = {
  /** rows sampled into chat grounding context */
  SAMPLE_ROWS: 40,
  /** top/bottom rows per numeric column in the extremes table */
  EXTREMES: 3,
  /** anomalies included in grounding */
  TOP_ANOMALIES: 10,
} as const;

export const LIMITS = {
  MAX_ROWS: 200_000,
  MAX_BYTES: 25 * 1024 * 1024,
  /** row counts at/above this profile in a Web Worker so the tab stays responsive */
  WORKER_ROW_THRESHOLD: 20_000,
} as const;
