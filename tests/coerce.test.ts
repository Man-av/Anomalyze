import { describe, expect, it } from "vitest";
import { isBlank, toBoolean, toDate, toNumber } from "@/lib/analysis/coerce";

describe("isBlank", () => {
  it("treats null and whitespace-only strings as blank", () => {
    expect(isBlank(null)).toBe(true);
    expect(isBlank("")).toBe(true);
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("0")).toBe(false);
    expect(isBlank(0)).toBe(false);
    expect(isBlank(false)).toBe(false);
  });
});

describe("toNumber", () => {
  it("parses plain numbers", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("3.14")).toBe(3.14);
    expect(toNumber("-5")).toBe(-5);
  });

  it("strips currency, thousands separators, and percent signs", () => {
    expect(toNumber("$1,234.50")).toBe(1234.5);
    expect(toNumber("€99")).toBe(99);
    expect(toNumber("₹1,00,000")).toBe(100000);
    expect(toNumber("12%")).toBe(12);
  });

  it("rejects non-numeric and non-finite values", () => {
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber("-")).toBeNull();
    expect(toNumber(true)).toBeNull();
    expect(toNumber(Infinity)).toBeNull();
    expect(toNumber(NaN)).toBeNull();
  });
});

describe("toBoolean", () => {
  it("recognizes common truthy/falsy tokens case-insensitively", () => {
    expect(toBoolean("true")).toBe(true);
    expect(toBoolean("YES")).toBe(true);
    expect(toBoolean("t")).toBe(true);
    expect(toBoolean("1")).toBe(true);
    expect(toBoolean("false")).toBe(false);
    expect(toBoolean("No")).toBe(false);
    expect(toBoolean("0")).toBe(false);
    expect(toBoolean(true)).toBe(true);
  });

  it("returns null for anything else", () => {
    expect(toBoolean("maybe")).toBeNull();
    expect(toBoolean("2")).toBeNull();
    expect(toBoolean(null)).toBeNull();
  });
});

describe("toDate", () => {
  it("parses common date formats", () => {
    expect(toDate("2023-01-15")).toBeInstanceOf(Date);
    expect(toDate("2023/01/15")).toBeInstanceOf(Date);
    expect(toDate("01/15/2023")).toBeInstanceOf(Date);
    expect(toDate("2023-01-15T10:30:00")).toBeInstanceOf(Date);
  });

  it("does NOT parse bare numbers or years as dates", () => {
    expect(toDate("2020")).toBeNull();
    expect(toDate("12345")).toBeNull();
    expect(toDate(2020)).toBeNull();
  });

  it("rejects clearly non-date strings", () => {
    expect(toDate("hello")).toBeNull();
    expect(toDate("")).toBeNull();
  });

  it("parses the expected calendar date (local, timezone-independent)", () => {
    const d = toDate("2023-01-15");
    expect(d?.getFullYear()).toBe(2023);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(15);
  });
});
