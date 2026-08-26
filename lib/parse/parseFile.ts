/**
 * File parsing: CSV via PapaParse, XLSX via SheetJS. All values are read as
 * strings (or null when blank) — coercion is centralized in the analysis engine
 * (`lib/analysis/coerce.ts`), so parsing never guesses types. This keeps a value
 * like "007" or "2020" from being silently converted before we've inferred what
 * the column actually is.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { LIMITS } from "@/lib/config";
import type { Primitive, Row } from "@/lib/types";

export interface ParseResult {
  rows: Row[];
  /** header order as it appeared in the file */
  columns: string[];
  /** true when the file exceeded LIMITS.MAX_ROWS and was cut off */
  truncated: boolean;
  sourceName: string;
}

/** Blank strings and undefined become null; everything else is kept verbatim. */
function normalizeCell(v: unknown): Primitive {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v;
  const s = String(v);
  return s.trim() === "" ? null : s;
}

function assembleRows(
  records: Record<string, unknown>[],
  columns: string[],
): { rows: Row[]; truncated: boolean } {
  const truncated = records.length > LIMITS.MAX_ROWS;
  const capped = truncated ? records.slice(0, LIMITS.MAX_ROWS) : records;
  const rows: Row[] = capped.map((rec) => {
    const row: Row = {};
    for (const col of columns) row[col] = normalizeCell(rec[col]);
    return row;
  });
  return { rows, truncated };
}

export function parseCsv(text: string, sourceName = "data.csv"): ParseResult {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const columns = (parsed.meta.fields ?? []).filter((f) => f.length > 0);
  const { rows, truncated } = assembleRows(parsed.data, columns);
  return { rows, columns, truncated, sourceName };
}

export function parseWorkbook(data: ArrayBuffer, sourceName = "data.xlsx"): ParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { rows: [], columns: [], truncated: false, sourceName };
  const ws = wb.Sheets[firstSheet]!;
  // raw:false formats values (e.g. dates) to strings; defval:null fills blanks.
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: false,
  });
  const columns = records.length > 0 ? Object.keys(records[0]!) : [];
  const { rows, truncated } = assembleRows(records, columns);
  return { rows, columns, truncated, sourceName };
}

/** Dispatch on file extension, reading the File with the appropriate reader. */
export async function parseFile(file: File): Promise<ParseResult> {
  if (file.size > LIMITS.MAX_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ${
        LIMITS.MAX_BYTES / 1024 / 1024
      } MB limit.`,
    );
  }
  const name = file.name;
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseWorkbook(await file.arrayBuffer(), name);
  }
  // Default to CSV/TSV/plain text.
  return parseCsv(await file.text(), name);
}
