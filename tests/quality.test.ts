import { describe, expect, it } from "vitest";
import { computeQuality } from "@/lib/analysis/quality";
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

describe("computeQuality", () => {
  it("gives a clean dataset a perfect score", () => {
    const rows: Row[] = [
      { a: 1, b: "x" },
      { a: 2, b: "y" },
      { a: 3, b: "z" },
    ];
    const q = computeQuality(profileAll(rows), rows);
    expect(q.score).toBe(100);
    expect(q.grade).toBe("A");
    expect(q.components).toHaveLength(0);
  });

  it("penalizes missing values proportionally", () => {
    const rows: Row[] = [
      { a: 1, b: "x" },
      { a: null, b: "y" },
      { a: 3, b: null },
      { a: 4, b: null },
    ];
    const q = computeQuality(profileAll(rows), rows);
    expect(q.missingCellsPct).toBeCloseTo(0.375, 6);
    expect(q.score).toBe(85);
    expect(q.grade).toBe("B");
    expect(q.components.some((c) => c.label === "Missing values")).toBe(true);
  });

  it("counts and penalizes duplicate rows", () => {
    const rows: Row[] = [
      { a: 1, b: "x" },
      { a: 1, b: "x" },
      { a: 2, b: "y" },
      { a: 1, b: "x" },
    ];
    const q = computeQuality(profileAll(rows), rows);
    expect(q.duplicateRows).toBe(2);
    expect(q.duplicateRowsPct).toBeCloseTo(0.5, 6);
    expect(q.score).toBe(75);
  });

  it("flags constant columns", () => {
    const rows: Row[] = [
      { a: 1, c: "same" },
      { a: 2, c: "same" },
      { a: 3, c: "same" },
    ];
    const q = computeQuality(profileAll(rows), rows);
    expect(q.constantColumns).toContain("c");
    expect(q.score).toBe(95);
  });
});
