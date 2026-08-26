import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/parse/parseFile";
import { profileDataset } from "@/lib/analysis/profile";
import type { ColumnProfile } from "@/lib/types";

const csv = readFileSync(join(process.cwd(), "tests/fixtures/sample.csv"), "utf8");

function typeOf(cols: ColumnProfile[], name: string) {
  return cols.find((c) => c.name === name)?.type;
}

describe("profileDataset (end-to-end on sample.csv)", () => {
  const { rows } = parseCsv(csv);
  const profile = profileDataset(rows);

  it("counts rows and columns", () => {
    expect(profile.rowCount).toBe(10);
    expect(profile.columnCount).toBe(5);
  });

  it("infers the expected column types", () => {
    expect(typeOf(profile.columns, "id")).toBe("id");
    expect(typeOf(profile.columns, "date")).toBe("datetime");
    expect(typeOf(profile.columns, "revenue")).toBe("integer");
    expect(typeOf(profile.columns, "category")).toBe("categorical");
    expect(typeOf(profile.columns, "active")).toBe("boolean");
  });

  it("selects the date column as the time index", () => {
    expect(profile.datetimeIndex).toBe("date");
  });

  it("flags the planted revenue outlier", () => {
    const hit = profile.anomalies.find((a) => a.column === "revenue" && a.value === 9999);
    expect(hit).toBeDefined();
    expect(hit?.direction).toBe("up");
  });

  it("scores a clean dataset highly", () => {
    expect(profile.quality.score).toBe(100);
    expect(profile.quality.grade).toBe("A");
  });

  it("summarizes the type breakdown", () => {
    expect(profile.typeBreakdown.datetime).toBe(1);
    expect(profile.typeBreakdown.boolean).toBe(1);
    expect(profile.typeBreakdown.categorical).toBe(1);
    expect(profile.typeBreakdown.id).toBe(1);
    expect(profile.typeBreakdown.integer).toBe(1);
  });
});
