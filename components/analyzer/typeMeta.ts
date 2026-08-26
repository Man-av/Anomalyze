import type { BadgeTone } from "@/components/ui/Badge";
import type { AnomalyBand, AnomalyMethod, ColumnType, QualityGrade } from "@/lib/types";

/** Label + badge tone for each inferred column type. */
export const TYPE_META: Record<ColumnType, { label: string; tone: BadgeTone }> = {
  integer: { label: "Integer", tone: "info" },
  numeric: { label: "Numeric", tone: "info" },
  boolean: { label: "Boolean", tone: "accent" },
  datetime: { label: "Date/Time", tone: "ok" },
  categorical: { label: "Category", tone: "warn" },
  id: { label: "ID", tone: "neutral" },
  text: { label: "Text", tone: "neutral" },
};

/** Label + badge tone for anomaly severity bands. */
export const BAND_META: Record<AnomalyBand, { label: string; tone: BadgeTone }> = {
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "info" },
};

/** Short label for each anomaly detection method. */
export const METHOD_LABEL: Record<AnomalyMethod, string> = {
  mad: "MAD z-score",
  iqr: "IQR fence",
  timewise: "Rolling",
};

const GRADE_TONE: Record<QualityGrade, BadgeTone> = {
  A: "ok",
  B: "ok",
  C: "warn",
  D: "warn",
  F: "danger",
};

export function gradeTone(grade: QualityGrade): BadgeTone {
  return GRADE_TONE[grade];
}

/** Solid background class for a given badge tone (used for meter fills). */
export const TONE_BAR: Record<BadgeTone, string> = {
  neutral: "bg-muted-2",
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
};
