import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/parse/parseFile";
import { profileDataset } from "@/lib/analysis/profile";
import { buildGrounding, serializeGrounding } from "@/lib/llm/grounding";

const csv = readFileSync(join(process.cwd(), "tests/fixtures/sample.csv"), "utf8");
const { rows } = parseCsv(csv);
const profile = profileDataset(rows);

describe("buildGrounding (on sample.csv)", () => {
  const g = buildGrounding(profile, rows);

  it("carries the dataset shape and time index", () => {
    expect(g.rowCount).toBe(10);
    expect(g.columnCount).toBe(5);
    expect(g.datetimeIndex).toBe("date");
  });

  it("describes every column", () => {
    expect(g.columns).toHaveLength(5);
    expect(g.columns.some((c) => c.startsWith("revenue (integer)"))).toBe(true);
    expect(g.columns.some((c) => c.startsWith("category (categorical)"))).toBe(true);
  });

  it("computes exact extremes for numeric columns (and excludes id columns)", () => {
    const rev = g.extremes.find((e) => e.column === "revenue");
    expect(rev).toBeDefined();
    // planted outlier is the highest revenue, at row index 4
    expect(rev?.high[0]).toEqual({ value: 9999, rowIndex: 4 });
    // lowest revenue is 100, at row index 0
    expect(rev?.low[0]).toEqual({ value: 100, rowIndex: 0 });
    // id-typed columns must not get an extremes entry
    expect(g.extremes.some((e) => e.column === "id")).toBe(false);
  });

  it("surfaces the planted anomaly", () => {
    const hit = g.anomalies.find((a) => a.column === "revenue" && a.value === 9999);
    expect(hit).toBeDefined();
    expect(hit?.direction).toBe("up");
    expect(hit?.rowIndex).toBe(4);
  });

  it("keeps every row when the dataset is smaller than the sample cap", () => {
    expect(g.rows).toHaveLength(10);
    expect(g.rows[0]).toEqual({ rowIndex: 0, values: rows[0] });
    // the anomalous/extreme row is concretely present
    expect(g.rows.some((r) => r.rowIndex === 4)).toBe(true);
  });

  it("is pure and deterministic", () => {
    expect(buildGrounding(profile, rows)).toEqual(g);
  });
});

describe("serializeGrounding", () => {
  const text = serializeGrounding(buildGrounding(profile, rows));

  it("renders the labeled sections the prompt relies on", () => {
    expect(text).toContain("## Data quality");
    expect(text).toContain("## Columns");
    expect(text).toContain("## Extremes per numeric column");
    expect(text).toContain("## Sample rows");
    expect(text).toContain("rowIndex");
  });

  it("includes concrete values the model can cite", () => {
    expect(text).toContain("revenue");
    expect(text).toContain("9999");
  });
});
