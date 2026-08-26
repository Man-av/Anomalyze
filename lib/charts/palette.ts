/**
 * Chart encoding colors. Values live as theme-aware CSS variables in
 * globals.css; here we reference them so chart components stay theme-agnostic
 * (Recharts and inline styles both accept `var(--…)` color strings).
 */

export const CATEGORICAL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** Categorical color for the i-th series, wrapping around the palette. */
export function catColor(i: number): string {
  return CATEGORICAL[((i % CATEGORICAL.length) + CATEGORICAL.length) % CATEGORICAL.length]!;
}

export const CHART_COLORS = {
  primary: "var(--chart-1)",
  pos: "var(--chart-pos)",
  neg: "var(--chart-neg)",
  anomaly: "var(--chart-anomaly)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
} as const;

/**
 * Diverging fill for a correlation cell in [-1, 1]: positive hue for r>0,
 * negative hue for r<0, magnitude encoded as opacity (transparent at 0).
 * color-mix keeps it theme-aware without JS interpolation. Opacity is capped
 * below full saturation so overlaid cell text stays legible in both themes.
 */
export function corrFill(r: number): string {
  const pct = Math.round(Math.min(1, Math.abs(r)) * 72);
  const hue = r >= 0 ? CHART_COLORS.pos : CHART_COLORS.neg;
  return `color-mix(in srgb, ${hue} ${pct}%, transparent)`;
}
