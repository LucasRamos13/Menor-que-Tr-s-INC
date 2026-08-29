import { describe, expect, it, vi, afterEach } from "vitest";
import { daysUntil, nextYearlyOccurrence, toISODateString, isPast, isToday } from "@/lib/dates";

describe("dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes days until a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    expect(daysUntil("2026-01-10")).toBe(9);
    expect(daysUntil("2025-12-31")).toBe(-1);
    expect(daysUntil("2026-01-01")).toBe(0);
  });

  it("flags a past date correctly regardless of time of day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T23:00:00Z"));
    expect(isPast("2026-06-14")).toBe(true);
    expect(isPast("2026-06-15")).toBe(false);
    expect(isToday("2026-06-15")).toBe(true);
  });

  it("rolls a yearly anniversary to next year once it has passed this year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
    const next = nextYearlyOccurrence("2020-03-15"); // March already passed in 2026
    expect(toISODateString(next)).toBe("2027-03-15");
  });

  it("keeps a yearly anniversary in the current year when it hasn't happened yet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const next = nextYearlyOccurrence("2020-12-25");
    expect(toISODateString(next)).toBe("2026-12-25");
  });
});
