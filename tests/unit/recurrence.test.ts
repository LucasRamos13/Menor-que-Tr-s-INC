import { describe, expect, it } from "vitest";
import { occurrencesBetween } from "@/services/finance/recurrence";

describe("occurrencesBetween", () => {
  it("generates monthly occurrences on the given day", () => {
    const dates = occurrencesBetween(
      { frequency: "monthly", intervalCount: 1, dayOfMonth: 10, startDate: "2026-01-10" },
      "2026-04-10",
    );
    expect(dates).toEqual(["2026-01-10", "2026-02-10", "2026-03-10", "2026-04-10"]);
  });

  it("clamps day_of_month to the last day of shorter months", () => {
    const dates = occurrencesBetween(
      { frequency: "monthly", intervalCount: 1, dayOfMonth: 31, startDate: "2026-01-31" },
      "2026-04-30",
    );
    // Feb has 28 days in 2026 (not a leap year), April has 30.
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("only returns occurrences strictly after `since`, for incremental generation", () => {
    const rule = { frequency: "monthly" as const, intervalCount: 1, dayOfMonth: 5, startDate: "2026-01-05" };
    const all = occurrencesBetween(rule, "2026-05-05");
    const incremental = occurrencesBetween(rule, "2026-05-05", "2026-03-05");
    expect(all).toEqual(["2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05", "2026-05-05"]);
    expect(incremental).toEqual(["2026-04-05", "2026-05-05"]);
  });

  it("respects an end date", () => {
    const dates = occurrencesBetween(
      { frequency: "weekly", intervalCount: 1, startDate: "2026-01-05", endDate: "2026-01-19" },
      "2026-03-01",
    );
    expect(dates).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
  });

  it("handles yearly recurrence across leap years", () => {
    const dates = occurrencesBetween({ frequency: "yearly", intervalCount: 1, startDate: "2024-02-29" }, "2027-01-01");
    // 2025 and 2026 and 2027 are not leap years, so Feb 29 clamps to Feb 28.
    expect(dates).toEqual(["2024-02-29", "2025-02-28", "2026-02-28"]);
  });

  it("supports an interval greater than 1", () => {
    const dates = occurrencesBetween({ frequency: "daily", intervalCount: 3, startDate: "2026-01-01" }, "2026-01-10");
    expect(dates).toEqual(["2026-01-01", "2026-01-04", "2026-01-07", "2026-01-10"]);
  });

  it("returns nothing when since is already caught up to the end date", () => {
    const dates = occurrencesBetween(
      { frequency: "monthly", intervalCount: 1, startDate: "2026-01-01", endDate: "2026-02-01" },
      "2026-06-01",
      "2026-02-01",
    );
    expect(dates).toEqual([]);
  });
});
