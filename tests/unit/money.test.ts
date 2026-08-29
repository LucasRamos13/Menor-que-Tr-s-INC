import { describe, expect, it } from "vitest";
import { centsToBRL, parseBRLToCents, percentage, sumCents } from "@/lib/money";

describe("money", () => {
  it("formats cents as BRL", () => {
    expect(centsToBRL(105000)).toBe("R$ 1.050,00");
    expect(centsToBRL(0)).toBe("R$ 0,00");
  });

  it("parses Brazilian-formatted input into cents", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("1234,56")).toBe(123456);
    expect(parseBRLToCents("50")).toBe(5000);
    expect(parseBRLToCents("R$ 50,00")).toBe(5000);
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("")).toBeNull();
  });

  it("never loses cents to floating point rounding", () => {
    expect(parseBRLToCents("0,10")).toBe(10);
    expect(parseBRLToCents("19,99")).toBe(1999);
    expect(parseBRLToCents("100,01")).toBe(10001);
  });

  it("sums a list of cent values", () => {
    expect(sumCents([100, 200, 300])).toBe(600);
    expect(sumCents([])).toBe(0);
  });

  it("computes percentage capped at 100", () => {
    expect(percentage(50, 100)).toBe(50);
    expect(percentage(185, 300)).toBeCloseTo(61.7, 1);
    expect(percentage(150, 100)).toBe(100);
    expect(percentage(10, 0)).toBe(0);
  });
});
