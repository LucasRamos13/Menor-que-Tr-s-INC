/**
 * Thin wrapper around the Google Calendar REST API. No googleapis SDK
 * dependency — plain fetch keeps the bundle small and works unmodified on
 * the Edge runtime (required for Cloudflare).
 */

const API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

export interface GoogleEventDateTime {
  date?: string; // all-day events
  dateTime?: string; // timed events, RFC3339
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  recurrence?: string[];
  updated?: string;
  etag?: string;
}

class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function googleFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GoogleApiError(`Google Calendar API ${path} failed (${response.status}): ${body}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function isGoogleGoneError(error: unknown): boolean {
  return error instanceof GoogleApiError && error.status === 410;
}

export function isGoogleNotFoundError(error: unknown): boolean {
  return error instanceof GoogleApiError && error.status === 404;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const result = await googleFetch<{ items: GoogleCalendarListEntry[] }>(accessToken, "/users/me/calendarList");
  return result.items ?? [];
}

export interface ListEventsResult {
  events: GoogleEvent[];
  nextSyncToken?: string;
}

/**
 * Lists events for a calendar. Pass `syncToken` for a cheap incremental
 * sync (Google's recommended approach — see
 * https://developers.google.com/calendar/api/guides/sync); omit it (and
 * pass `timeMinISO`) to do a bounded initial import instead of pulling a
 * calendar's entire history.
 */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  options: { syncToken?: string; timeMinISO?: string } = {},
): Promise<ListEventsResult> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
    if (options.syncToken) {
      params.set("syncToken", options.syncToken);
    } else if (options.timeMinISO) {
      params.set("timeMin", options.timeMinISO);
    }
    if (pageToken) params.set("pageToken", pageToken);

    const page = await googleFetch<{ items: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string }>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );

    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

export async function insertEvent(accessToken: string, calendarId: string, event: Partial<GoogleEvent>): Promise<GoogleEvent> {
  return googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function updateEvent(accessToken: string, calendarId: string, eventId: string, event: Partial<GoogleEvent>): Promise<GoogleEvent> {
  return googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(event),
  });
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await googleFetch<void>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    // Already gone on Google's side — treat as success, nothing left to reconcile.
    if (!isGoogleNotFoundError(error)) throw error;
  }
}
