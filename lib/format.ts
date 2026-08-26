/**
 * Display formatting helpers, shared by the UI and the deterministic narrative.
 * All are locale-independent (no `toLocaleString`) so output is stable across
 * environments and safe for snapshot tests.
 */

/** Integer with thousands separators: 1234567 -> "1,234,567". */
export function fmtInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Number with up to 2 decimals and thousands separators; trims trailing zeros. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  if (Number.isInteger(n)) return fmtInt(n);
  const rounded = Math.round(n * 100) / 100;
  const sign = rounded < 0 ? "-" : "";
  const [intPart, decPart] = Math.abs(rounded).toString().split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${sign}${withCommas}.${decPart}` : `${sign}${withCommas}`;
}

/** Fraction (0..1) to a percent string: 0.375 -> "37.5%". */
export function fmtPct(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return "n/a";
  return `${(x * 100).toFixed(digits)}%`;
}

/** Compact magnitude for tight spaces: 1500 -> "1.5K", 2_300_000 -> "2.3M". */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  const abs = Math.abs(n);
  if (abs < 1000) return fmtNum(n);
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [threshold, suffix] of units) {
    if (abs >= threshold) {
      const scaled = n / threshold;
      const s = (Math.round(scaled * 10) / 10).toString();
      return `${s}${suffix}`;
    }
  }
  return fmtNum(n);
}

/** Human-readable byte size: 1536 -> "1.5 KB". */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${(Math.round(value * 10) / 10).toString()} ${units[i]}`;
}
