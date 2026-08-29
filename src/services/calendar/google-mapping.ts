import type { GoogleEvent } from "@/lib/google/calendar-client";

export interface InternalEventFields {
  title: string;
  description: string | null;
  location: string | null;
  start_at: string; // ISO datetime, UTC
  end_at: string;
  all_day: boolean;
}

/**
 * events.end_at is stored as an inclusive instant. Google's all-day `end.date`
 * is EXCLUSIVE (the day after the last day), so it needs +1/-1 day handling
 * at the boundary in both directions.
 */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function internalEventToGoogleEvent(event: InternalEventFields): Partial<GoogleEvent> {
  const base: Partial<GoogleEvent> = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
  };

  if (event.all_day) {
    return {
      ...base,
      start: { date: event.start_at.slice(0, 10) },
      end: { date: addDays(event.end_at.slice(0, 10), 1) },
    };
  }

  return {
    ...base,
    start: { dateTime: new Date(event.start_at).toISOString() },
    end: { dateTime: new Date(event.end_at).toISOString() },
  };
}

export function googleEventToInternalEvent(gEvent: GoogleEvent): InternalEventFields {
  const allDay = Boolean(gEvent.start.date);

  const start_at = allDay ? `${gEvent.start.date}T00:00:00.000Z` : new Date(gEvent.start.dateTime!).toISOString();
  const end_at = allDay
    ? `${addDays(gEvent.end.date!, -1)}T00:00:00.000Z`
    : new Date(gEvent.end.dateTime!).toISOString();

  return {
    title: gEvent.summary?.trim() || "(Sem título)",
    description: gEvent.description ?? null,
    location: gEvent.location ?? null,
    start_at,
    end_at,
    all_day: allDay,
  };
}

// ----------------------------------------------------------------------------
// Conflict resolution

export type SyncAction =
  | { type: "noop" }
  | { type: "apply_remote_to_local" }
  | { type: "apply_local_to_remote" }
  | { type: "delete_local" }
  | { type: "delete_remote" }
  | { type: "recreate_remote_from_local"; reason: "conflict" }
  | { type: "recreate_local_from_remote"; reason: "conflict" }
  | { type: "conflict_remote_wins" }
  | { type: "conflict_local_wins" };

export interface ReconcileInput {
  /** null means the event was deleted (Google: status=cancelled; local: row missing). */
  googleUpdatedAt: string | null;
  localUpdatedAt: string | null;
  /** Snapshots captured the last time both sides were confirmed in sync. */
  lastSyncedGoogleUpdatedAt: string | null;
  lastSyncedLocalUpdatedAt: string | null;
}

/**
 * Decides what to do for one linked event, given what changed on each side
 * since the last successful sync. Pure and deterministic so it can be unit
 * tested without touching Google or Supabase. See docs/google-calendar.md
 * for the full write-up of this state machine.
 */
export function reconcile(input: ReconcileInput): SyncAction {
  const { googleUpdatedAt, localUpdatedAt, lastSyncedGoogleUpdatedAt, lastSyncedLocalUpdatedAt } = input;

  const googleDeleted = googleUpdatedAt === null;
  const localDeleted = localUpdatedAt === null;
  const googleChanged = googleUpdatedAt !== lastSyncedGoogleUpdatedAt;
  const localChanged = localUpdatedAt !== lastSyncedLocalUpdatedAt;

  if (googleDeleted && localDeleted) return { type: "noop" };

  if (googleDeleted) {
    // Google side removed. If local also didn't change, mirror the deletion.
    // If local changed since last sync, the user's edit wins: recreate on Google.
    return localChanged ? { type: "recreate_remote_from_local", reason: "conflict" } : { type: "delete_local" };
  }

  if (localDeleted) {
    // Local side removed. If Google also didn't change, mirror the deletion.
    // If Google changed since last sync, prefer not to lose that edit: restore locally.
    return googleChanged ? { type: "recreate_local_from_remote", reason: "conflict" } : { type: "delete_remote" };
  }

  if (!googleChanged && !localChanged) return { type: "noop" };
  if (googleChanged && !localChanged) return { type: "apply_remote_to_local" };
  if (!googleChanged && localChanged) return { type: "apply_local_to_remote" };

  // Both changed since the last sync: last-write-wins by timestamp, but the
  // caller must record this as a conflict (never a silent overwrite).
  const googleIsNewer = new Date(googleUpdatedAt).getTime() >= new Date(localUpdatedAt!).getTime();
  return googleIsNewer ? { type: "conflict_remote_wins" } : { type: "conflict_local_wins" };
}
