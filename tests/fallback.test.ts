import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/parse/parseFile";
import { profileDataset } from "@/lib/analysis/profile";
import { buildFallbackReport } from "@/lib/narrative/fallback";

const csv = readFileSync(join(process.cwd(), "tests/fixtures/sample.csv"), "utf8");

describe("buildFallbackReport", () => {
  const { rows } = parseCsv(csv);
  const report = buildFallbackReport(profileDataset(rows));

  it("is marked as a deterministic fallback", () => {
    expect(report.source).toBe("fallback");
  });

  it("titles a time-series dataset accordingly", () => {
    expect(report.title).toContain("Time-series profile");
  });

  it("describes the dataset shape in the overview", () => {
    expect(report.datasetOverview).toContain("10 rows");
    expect(report.datasetOverview).toContain("5 columns");
  });

  it("mentions the planted outlier in the anomaly notes", () => {
    expect(report.anomalyNotes).toContain("9,999");
    expect(report.anomalyNotes).toContain("revenue");
  });

  it("reports the quality grade", () => {
    expect(report.dataQualityNotes).toContain("100/100");
    expect(report.dataQualityNotes).toContain("grade A");
  });

  it("produces bounded, non-empty findings and questions", () => {
    expect(report.keyFindings.length).toBeGreaterThan(0);
    expect(report.suggestedQuestions.length).toBeGreaterThan(0);
    expect(report.suggestedQuestions.length).toBeLessThanOrEqual(6);
  });
});
