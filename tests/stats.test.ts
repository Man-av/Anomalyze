import { describe, expect, it } from "vitest";
import {
  histogramBins,
  mad,
  mean,
  median,
  mode,
  quantile,
  shannonEntropy,
  skewness,
  sortedAsc,
  std,
  sum,
  valueCounts,
  variance,
} from "@/lib/analysis/stats";

describe("basic aggregates", () => {
  it("sum and mean", () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(Number.isNaN(mean([]))).toBe(true);
  });

  it("sortedAsc does not mutate its input", () => {
    const input = [3, 1, 2];
    const out = sortedAsc(input);
    expect(out).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("quantile / median", () => {
  it("interpolates like numpy's default", () => {
    const asc = sortedAsc([1, 2, 3, 4]);
    expect(quantile(asc, 0)).toBe(1);
    expect(quantile(asc, 1)).toBe(4);
    expect(quantile(asc, 0.5)).toBe(2.5);
    expect(quantile(asc, 0.25)).toBeCloseTo(1.75, 10);
  });

  it("median handles odd and even lengths", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("spread", () => {
  it("sample variance and std use n-1", () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.5714, 3);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.1381, 3);
    expect(variance([5])).toBe(0);
  });

  it("mad is the median absolute deviation about the median", () => {
    // values 1..5, median 3, deviations [2,1,0,1,2] -> median 1
    expect(mad([1, 2, 3, 4, 5])).toBe(1);
  });
});

describe("skewness", () => {
  it("is ~0 for symmetric data and positive for a right tail", () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 6);
    expect(skewness([1, 1, 1, 2, 10])).toBeGreaterThan(0);
  });

  it("returns 0 when undefined (n<3 or zero variance)", () => {
    expect(skewness([1, 2])).toBe(0);
    expect(skewness([5, 5, 5, 5])).toBe(0);
  });
});

describe("histogramBins", () => {
  it("returns a single bin for constant data", () => {
    const bins = histogramBins([7, 7, 7, 7]);
    expect(bins).toHaveLength(1);
    expect(bins[0]).toMatchObject({ x0: 7, x1: 7, count: 4 });
  });

  it("assigns every value to exactly one bin", () => {
    const values = Array.from({ length: 100 }, (_, i) => i);
    const bins = histogramBins(values);
    const total = bins.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(100);
    expect(bins.length).toBeGreaterThan(1);
    expect(bins.length).toBeLessThanOrEqual(50);
  });
});

describe("categorical helpers", () => {
  it("valueCounts is descending by frequency", () => {
    const counts = valueCounts(["a", "b", "a", "c", "a", "b"]);
    expect([...counts.entries()]).toEqual([
      ["a", 3],
      ["b", 2],
      ["c", 1],
    ]);
  });

  it("mode returns the most frequent value", () => {
    expect(mode(["x", "y", "x"])).toBe("x");
    expect(mode([])).toBe("");
  });

  it("shannonEntropy is 0 for one category and 1 bit for an even split", () => {
    expect(shannonEntropy([10])).toBe(0);
    expect(shannonEntropy([5, 5])).toBeCloseTo(1, 10);
    expect(shannonEntropy([])).toBe(0);
  });
});
