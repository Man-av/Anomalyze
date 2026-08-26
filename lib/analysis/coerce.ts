/**
 * Value coercion primitives used by type inference and profiling.
 * Each returns `null` when the value can't be interpreted as the target type,
 * so callers can measure "what fraction of this column parses as X".
 */

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import type { Primitive } from "@/lib/types";

dayjs.extend(customParseFormat);

const TRUE_TOKENS = new Set(["true", "yes", "y", "t", "1"]);
const FALSE_TOKENS = new Set(["false", "no", "n", "f", "0"]);

/** Strict date formats, tried in order. Bare years/integers are intentionally
 * excluded so "2020" stays a number, not a date. */
const DATE_FORMATS = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DDTHH:mm",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "MM-DD-YYYY",
  "DD-MM-YYYY",
  "YYYY-MM",
  "YYYY/MM",
];

export function isBlank(v: Primitive): boolean {
  return v === null || (typeof v === "string" && v.trim() === "");
}

export function toBoolean(v: Primitive): boolean | null {
  if (typeof v === "boolean") return v;
  if (isBlank(v)) return null;
  const s = String(v).trim().toLowerCase();
  if (TRUE_TOKENS.has(s)) return true;
  if (FALSE_TOKENS.has(s)) return false;
  return null;
}

export function toNumber(v: Primitive): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return null;
  if (isBlank(v)) return null;
  // Strip currency symbols, thousands separators, a trailing percent sign,
  // and whitespace. Note: "12%" becomes 12 (the sign is dropped, value kept).
  let s = String(v).trim().replace(/[$€£₹,\s]/g, "");
  if (s.endsWith("%")) s = s.slice(0, -1);
  if (s === "" || s === "-" || s === "." || s === "+") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toDate(v: Primitive): Date | null {
  if (typeof v === "number" || typeof v === "boolean") return null;
  if (isBlank(v)) return null;
  const s = String(v).trim();
  // Require a date-like separator so bare numbers never parse as dates.
  if (!/[-/:T]/.test(s)) return null;
  const d = dayjs(s, DATE_FORMATS, true);
  if (d.isValid()) return d.toDate();
  // ISO fallback for timezone-offset strings the strict list doesn't cover.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
    const nd = new Date(s);
    if (!Number.isNaN(nd.getTime())) return nd;
  }
  return null;
}
