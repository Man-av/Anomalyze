import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/parse/parseFile";

describe("parseCsv", () => {
  it("parses headers and rows, keeping values as strings", () => {
    const res = parseCsv("a,b\n1,x\n2,y\n");
    expect(res.columns).toEqual(["a", "b"]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toEqual({ a: "1", b: "x" });
    expect(res.truncated).toBe(false);
  });

  it("normalizes blank cells to null", () => {
    const res = parseCsv("a,b\n1,x\n,z\n");
    expect(res.rows[1]).toEqual({ a: null, b: "z" });
  });

  it("trims header whitespace", () => {
    const res = parseCsv(" x , y \n1,2\n");
    expect(res.columns).toEqual(["x", "y"]);
    expect(res.rows[0]).toEqual({ x: "1", y: "2" });
  });

  it("skips fully empty lines", () => {
    const res = parseCsv("a,b\n1,x\n\n2,y\n");
    expect(res.rows).toHaveLength(2);
  });
});
