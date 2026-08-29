import type { RecurrenceFrequency } from "@/types/database";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  intervalCount: number;
  dayOfMonth?: number | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
}

function parseISODate(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

function toISODate(y: number, m: number, d: number): string {
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.toISOString().slice(0, 10);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function normalizeISO(date: string): string {
  const { y, m, d } = parseISODate(date);
  return toISODate(y, m, d);
}

/**
 * Computes occurrence #k (0-indexed) directly from the rule's original start
 * date rather than accumulating from the previous occurrence. This matters
 * for monthly/yearly rules anchored on day 29-31: accumulating would clamp
 * a Feb 29 anniversary to Feb 28 in a non-leap year and then get "stuck" on
 * the 28th forever, even once a future leap year makes the 29th valid again.
 * Recomputing from the fixed start each time avoids that drift.
 */
function occurrenceAt(start: { y: number; m: number; d: number }, rule: RecurrenceRule, k: number): { y: number; m: number; d: number } {
  const { frequency, intervalCount } = rule;

  if (frequency === "daily") {
    const next = new Date(Date.UTC(start.y, start.m - 1, start.d + intervalCount * k));
    return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
  }

  if (frequency === "weekly") {
    const next = new Date(Date.UTC(start.y, start.m - 1, start.d + 7 * intervalCount * k));
    return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
  }

  if (frequency === "monthly") {
    const targetDay = rule.dayOfMonth ?? start.d;
    const totalMonths = (start.m - 1) + intervalCount * k;
    const y = start.y + Math.floor(totalMonths / 12);
    const m = (totalMonths % 12) + 1;
    return { y, m, d: Math.min(targetDay, daysInMonth(y, m)) };
  }

  // yearly
  const y = start.y + intervalCount * k;
  return { y, m: start.m, d: Math.min(start.d, daysInMonth(y, start.m)) };
}

/**
 * Returns every occurrence date (inclusive) strictly after `since` (or the
 * rule's start date, if `since` is not given) up to and including `until`.
 * Pure and deterministic — used both to materialize due transactions and in
 * unit tests.
 */
export function occurrencesBetween(rule: RecurrenceRule, until: string, since?: string | null): string[] {
  const start = parseISODate(rule.startDate);
  const untilISO = normalizeISO(until);
  const endLimit = rule.endDate ? normalizeISO(rule.endDate) : null;
  const sinceISO = since ? normalizeISO(since) : null;

  const results: string[] = [];

  // Safety valve: never generate more than 10 years worth of occurrences in one call.
  const guardMax = 3660;

  for (let k = 0; k < guardMax; k++) {
    const occurrence = occurrenceAt(start, rule, k);
    const occurrenceISO = toISODate(occurrence.y, occurrence.m, occurrence.d);

    if (occurrenceISO > untilISO) break;
    if (endLimit && occurrenceISO > endLimit) break;

    const isAfterSince = sinceISO ? occurrenceISO > sinceISO : true;
    if (isAfterSince) results.push(occurrenceISO);
  }

  return results;
}
