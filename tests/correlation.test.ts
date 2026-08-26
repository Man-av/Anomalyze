import { describe, expect, it } from "vitest";
import { computeCorrelation } from "@/lib/analysis/correlation";
import { profileColumn } from "@/lib/analysis/profileColumn";
import type { ColumnProfile, Row } from "@/lib/types";

function profileAll(rows: Row[]): ColumnProfile[] {
  const names = Object.keys(rows[0] ?? {});
  return names.map((n) =>
    profileColumn(
      n,
      rows.map((r) => r[n] ?? null),
    ),
  );
}

describe("computeCorrelation", () => {
  it("finds perfect positive and negative linear relationships", () => {
    // Non-monotonic with repeats so `x` stays numeric (a plain 0..n ramp would
    // be inferred as an id column and excluded).
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 5, 4, 3, 2];
    const rows: Row[] = xs.map((x) => ({ x, y: 3 * x + 2, w: 100 - 2 * x }));
    const cols = profileAll(rows);
    const { columns, matrix, strongPairs } = computeCorrelation(cols, rows);

    const ix = columns.indexOf("x");
    const iy = columns.indexOf("y");
    const iw = columns.indexOf("w");
    expect(matrix[ix]![iy]).toBeCloseTo(1, 10);
    expect(matrix[ix]![iw]).toBeCloseTo(-1, 10);
    expect(matrix[ix]![ix]).toBe(1);

    expect(strongPairs).toHaveLength(3);
    expect(Math.abs(strongPairs[0]!.r)).toBeCloseTo(1, 10);
  });

  it("returns r=0 when fewer than MIN_PAIRS rows overlap", () => {
    const rows: Row[] = [
      { a: 3, b: 2 },
      { a: 1, b: null },
      { a: 4, b: null },
      { a: 1, b: 8 },
      { a: 5, b: null },
      { a: 9, b: 5 },
    ];
    const cols = profileAll(rows);
    const { columns, matrix, strongPairs } = computeCorrelation(cols, rows);
    const ia = columns.indexOf("a");
    const ib = columns.indexOf("b");
    // Both columns are numeric, but only 3 rows have both present (< MIN_PAIRS=5).
    expect(ia).toBeGreaterThanOrEqual(0);
    expect(ib).toBeGreaterThanOrEqual(0);
    expect(matrix[ia]![ib]).toBe(0);
    expect(strongPairs).toHaveLength(0);
  });

  it("excludes constant columns from the matrix", () => {
    const rows: Row[] = [
      { v: 3, k: 5 },
      { v: 1, k: 5 },
      { v: 4, k: 5 },
      { v: 1, k: 5 },
      { v: 5, k: 5 },
      { v: 9, k: 5 },
    ];
    const cols = profileAll(rows);
    const { columns } = computeCorrelation(cols, rows);
    expect(columns).toContain("v");
    expect(columns).not.toContain("k");
  });
});
