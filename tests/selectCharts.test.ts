import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { selectCharts } from "@/lib/charts/selectCharts";
import { profileDataset } from "@/lib/analysis/profile";
import { parseCsv } from "@/lib/parse/parseFile";
import { CHART } from "@/lib/config";
import type { Row } from "@/lib/types";

const csv = readFileSync(join(process.cwd(), "tests/fixtures/sample.csv"), "utf8");

describe("selectCharts (time-indexed fixture)", () => {
  const { rows } = parseCsv(csv);
  const profile = profileDataset(rows);
  const specs = selectCharts(profile, rows);

  it("charts the numeric column as a timeline (datetime index present)", () => {
    const timeline = specs.find((s) => s.kind === "timeline");
    expect(timeline).toBeDefined();
    expect(timeline?.kind === "timeline" && timeline.column).toBe("revenue");
    expect(timeline?.kind === "timeline" && timeline.dateColumn).toBe("date");
  });

  it("marks the planted outlier on the timeline", () => {
    const timeline = specs.find((s) => s.kind === "timeline");
    if (timeline?.kind !== "timeline") throw new Error("expected timeline");
    expect(timeline.anomalyCount).toBeGreaterThanOrEqual(1);
    const spike = timeline.points.find((p) => p.y === 9999);
    expect(spike?.band).toBeDefined();
    expect(spike?.direction).toBe("up");
  });

  it("does not chart the datetime index or the id column", () => {
    // date is the index (not a numeric chart); id is type `id` (no chart)
    expect(specs.some((s) => "column" in s && s.column === "date")).toBe(false);
    expect(specs.some((s) => "column" in s && s.column === "id")).toBe(false);
  });

  it("charts the categorical and boolean columns", () => {
    const bar = specs.find((s) => s.kind === "bar");
    expect(bar?.kind === "bar" && bar.column).toBe("category");
    expect(bar?.kind === "bar" && bar.items.length).toBeGreaterThanOrEqual(2);

    const bool = specs.find((s) => s.kind === "boolean");
    expect(bool?.kind === "boolean" && bool.column).toBe("active");
  });

  it("omits the heatmap when there is only one numeric column", () => {
    expect(specs.some((s) => s.kind === "heatmap")).toBe(false);
  });
});

/** Three correlated numeric columns, no datetime — exercises scatter + heatmap. */
function correlatedRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < 30; i++) {
    const alpha = ((i * 7) % 13) + (i % 5) * 0.5; // varied, non-monotonic
    const beta = alpha * 3 + (i % 2 === 0 ? 0.3 : -0.3); // strong positive
    const gamma = 50 - alpha * 2 + ((i % 3) - 1) * 0.4; // strong negative
    rows.push({ alpha, beta, gamma });
  }
  return rows;
}

describe("selectCharts (multi-numeric, no time index)", () => {
  const rows = correlatedRows();
  const profile = profileDataset(rows);
  const specs = selectCharts(profile, rows);

  it("emits a correlation heatmap and ranks it first", () => {
    expect(specs[0]?.kind).toBe("heatmap");
    const heatmap = specs.find((s) => s.kind === "heatmap");
    expect(heatmap?.kind === "heatmap" && heatmap.columns.length).toBe(3);
  });

  it("emits scatters for the strong pairs with a fitted trend", () => {
    const scatters = specs.filter((s) => s.kind === "scatter");
    expect(scatters.length).toBeGreaterThanOrEqual(1);
    for (const s of scatters) {
      if (s.kind !== "scatter") continue;
      expect(Math.abs(s.r)).toBeGreaterThanOrEqual(0.7);
      expect(s.trend).not.toBeNull();
      expect(s.points.length).toBe(30);
    }
  });

  it("falls back to histograms for the numeric columns", () => {
    const hist = specs.filter((s) => s.kind === "histogram");
    expect(hist.length).toBeGreaterThanOrEqual(1);
    for (const h of hist) {
      if (h.kind !== "histogram") continue;
      expect(h.bins.length).toBeGreaterThan(0);
    }
  });

  it("never exceeds the chart cap", () => {
    expect(specs.length).toBeLessThanOrEqual(CHART.MAX_CHARTS);
  });
});
