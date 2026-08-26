import { describe, expect, it } from "vitest";
import { inferColumnType } from "@/lib/analysis/inferType";
import type { Primitive } from "@/lib/types";

const repeat = (vals: Primitive[], times: number): Primitive[] =>
  Array.from({ length: times }, (_, i) => vals[i % vals.length]!);

describe("inferColumnType", () => {
  it("detects booleans from a small truthy/falsy set", () => {
    expect(inferColumnType("active", repeat(["yes", "no"], 20))).toBe("boolean");
    expect(inferColumnType("flag", repeat([true, false], 10))).toBe("boolean");
  });

  it("detects datetimes from parseable date strings", () => {
    const dates = ["2023-01-01", "2023-02-15", "2023-03-30", "2023-04-01"];
    expect(inferColumnType("signup", repeat(dates, 20))).toBe("datetime");
  });

  it("detects integers and floats", () => {
    expect(inferColumnType("score", [88, 92, 88, 75, 92, 88, 100, 75])).toBe("integer");
    expect(inferColumnType("price", ["9.99", "19.50", "9.99", "4.25", "9.99"])).toBe(
      "numeric",
    );
  });

  it("treats monotonic unique integers with an id-ish name as id", () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(inferColumnType("id", ids)).toBe("id");
    expect(inferColumnType("user_id", Array.from({ length: 30 }, (_, i) => `u${i}`))).toBe(
      "id",
    );
  });

  it("detects categoricals by low cardinality", () => {
    expect(inferColumnType("color", repeat(["red", "green", "blue"], 60))).toBe(
      "categorical",
    );
  });

  it("detects free text by high cardinality and length", () => {
    const comments = Array.from(
      { length: 30 },
      (_, i) => `This is a fairly long free-text comment number ${i % 25}`,
    );
    expect(inferColumnType("comment", comments)).toBe("text");
  });

  it("falls back to text for an all-blank column", () => {
    expect(inferColumnType("empty", [null, "", "   "])).toBe("text");
  });
});
