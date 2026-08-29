/**
 * Locale/timezone are centralized here so adding another language or
 * timezone later means changing this file, not every call site.
 */
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeZone: DEFAULT_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeZone: DEFAULT_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeZone: DEFAULT_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeZone: DEFAULT_TIMEZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return dateTimeFormatter.format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return timeFormatter.format(new Date(date));
}

export function formatLongDate(date: string | Date): string {
  return longDateFormatter.format(new Date(date));
}

/** Returns a YYYY-MM-DD string for a Date, in the app's default timezone. */
export function toISODateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(date);
}

export function todayISODate(): string {
  return toISODateString(new Date());
}

/** Days until a date (can be negative for past dates). Whole days, ignoring time-of-day. */
export function daysUntil(date: string | Date): number {
  const target = new Date(typeof date === "string" ? `${date.slice(0, 10)}T00:00:00` : date);
  const today = new Date(`${todayISODate()}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Given an anchor date and "recurring yearly" flag, returns the next
 * occurrence (this year if still upcoming, otherwise next year).
 */
export function nextYearlyOccurrence(anchorDate: string): Date {
  const anchor = new Date(`${anchorDate.slice(0, 10)}T00:00:00`);
  const today = new Date(`${todayISODate()}T00:00:00`);
  const candidate = new Date(anchor);
  candidate.setFullYear(today.getFullYear());
  if (candidate.getTime() < today.getTime()) {
    candidate.setFullYear(today.getFullYear() + 1);
  }
  return candidate;
}

export function isToday(date: string | Date): boolean {
  // Routed through daysUntil (not a direct string compare) so a plain
  // "YYYY-MM-DD" input is anchored to local midnight instead of being
  // parsed as UTC midnight and then rolled back a day when formatted in a
  // negative-offset timezone like America/Sao_Paulo.
  return daysUntil(date) === 0;
}

export function isPast(date: string | Date): boolean {
  return daysUntil(date) < 0;
}
