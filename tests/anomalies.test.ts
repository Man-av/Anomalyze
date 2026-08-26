import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/lib/analysis/anomalies";
import { profileColumn } from "@/lib/analysis/profileColumn";
import type { Row } from "@/lib/types";

describe("detectAnomalies (static MAD + IQR)", () => {
  it("flags a planted outlier and corroborates it across both methods", () => {
    const values = [10, 11, 9, 10, 12, 11, 10, 9, 1000, 11, 10];
    const rows: Row[] = values.map((v) => ({ x: v }));
    const col = profileColumn("x", values);

    const anomalies = detectAnomalies([col], rows);
    const hit = anomalies.find((a) => a.value === 1000);
    expect(hit).toBeDefined();
    expect(hit?.column).toBe("x");
    expect(hit?.direction).toBe("up");
    expect(hit?.band).toBe("high");
    expect(hit?.corroborated).toBe(true);
    expect(hit?.method).toBe("mad");
  });

  it("flags nothing on clean, tight data", () => {
    const values = [10, 11, 9, 10, 12, 11, 10, 9, 11, 10];
    const rows: Row[] = values.map((v) => ({ x: v }));
    const col = profileColumn("x", values);
    expect(detectAnomalies([col], rows)).toHaveLength(0);
  });
});

describe("detectAnomalies (time-aware)", () => {
  it("uses rolling detection when a datetime index is present", () => {
    const values = [10, 10, 11, 10, 11, 10, 500, 10, 11, 10, 10, 11];
    const rows: Row[] = values.map((v, i) => ({
      t: `2023-01-${String(i + 1).padStart(2, "0")}`,
      y: v,
    }));
    const cols = [
      profileColumn(
        "t",
        rows.map((r) => r.t ?? null),
      ),
      profileColumn(
        "y",
        rows.map((r) => r.y ?? null),
      ),
    ];

    const anomalies = detectAnomalies(cols, rows, "t");
    const hit = anomalies.find((a) => a.value === 500);
    expect(hit).toBeDefined();
    expect(hit?.method).toBe("timewise");
    expect(hit?.direction).toBe("up");
  });
});
