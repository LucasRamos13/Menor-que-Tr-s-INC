import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  listCalendars,
  listEvents,
  insertEvent,
  updateEvent,
  deleteEvent,
  isGoogleGoneError,
  type GoogleCalendarListEntry,
} from "@/lib/google/calendar-client";
import { refreshAccessToken } from "@/lib/google/oauth";
import { internalEventToGoogleEvent, googleEventToInternalEvent, reconcile } from "./google-mapping";

type TypedClient = SupabaseClient<Database>;
type Connection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];
type SyncEventRow = Database["public"]["Tables"]["calendar_sync_events"]["Row"];

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const INITIAL_IMPORT_WINDOW_DAYS_PAST = 90;

export async function getConnection(supabase: TypedClient, userId: string): Promise<Connection | null> {
  const { data, error } = await supabase.from("google_calendar_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureValidAccessToken(supabase: TypedClient, connection: Connection): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from("google_calendar_connections")
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
    .eq("id", connection.id);
  if (error) throw error;

  return refreshed.access_token;
}

export async function listAvailableGoogleCalendars(supabase: TypedClient, userId: string): Promise<GoogleCalendarListEntry[]> {
  const connection = await getConnection(supabase, userId);
  if (!connection) throw new Error("Nenhuma conta Google conectada.");
  const token = await ensureValidAccessToken(supabase, connection);
  return listCalendars(token);
}

export async function disconnectGoogle(supabase: TypedClient, userId: string): Promise<void> {
  const { error } = await supabase.from("google_calendar_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function setSyncEnabled(supabase: TypedClient, userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("google_calendar_connections").update({ sync_enabled: enabled }).eq("user_id", userId);
  if (error) throw error;
}

interface SyncSummary {
  imported: number;
  updatedLocal: number;
  updatedRemote: number;
  deletedLocal: number;
  deletedRemote: number;
  conflicts: number;
  errors: number;
}

function emptySummary(): SyncSummary {
  return { imported: 0, updatedLocal: 0, updatedRemote: 0, deletedLocal: 0, deletedRemote: 0, conflicts: 0, errors: 0 };
}

/**
 * Pulls remote changes for every calendar the user selected, reconciles them
 * against local state, and retries any local pushes that previously failed.
 * On-demand only (called from the UI or an explicit "Sincronizar agora"
 * action) — see docs/google-calendar.md for why this project deliberately
 * does not run background polling or webhooks.
 */
export async function syncNow(supabase: TypedClient, coupleId: string, userId: string): Promise<SyncSummary> {
  const connection = await getConnection(supabase, userId);
  if (!connection || !connection.sync_enabled) return emptySummary();

  const summary = emptySummary();

  try {
    const accessToken = await ensureValidAccessToken(supabase, connection);

    const { data: selections, error: selectionsError } = await supabase
      .from("google_calendar_selections")
      .select("*")
      .eq("connection_id", connection.id)
      .eq("is_syncing", true);
    if (selectionsError) throw selectionsError;

    for (const selection of selections ?? []) {
      await syncOneCalendar(supabase, coupleId, connection.id, accessToken, selection.google_calendar_id, selection.sync_token, summary);
    }

    const { error: statusError } = await supabase
      .from("google_calendar_connections")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "ok", last_sync_error: null })
      .eq("id", connection.id);
    if (statusError) throw statusError;
  } catch (error) {
    summary.errors += 1;
    const { error: statusError } = await supabase
      .from("google_calendar_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: error instanceof Error ? error.message : "Erro desconhecido",
      })
      .eq("id", connection.id);
    if (statusError) console.error("[google-sync-service] failed to record sync status", statusError);
  }

  return summary;
}

async function syncOneCalendar(
  supabase: TypedClient,
  coupleId: string,
  connectionId: string,
  accessToken: string,
  googleCalendarId: string,
  syncToken: string | null,
  summary: SyncSummary,
): Promise<void> {
  let result;
  try {
    result = syncToken
      ? await listEvents(accessToken, googleCalendarId, { syncToken })
      : await listEvents(accessToken, googleCalendarId, {
          timeMinISO: new Date(Date.now() - INITIAL_IMPORT_WINDOW_DAYS_PAST * 86400000).toISOString(),
        });
  } catch (error) {
    if (isGoogleGoneError(error)) {
      // Sync token expired/invalidated on Google's side — fall back to a full resync.
      result = await listEvents(accessToken, googleCalendarId, {
        timeMinISO: new Date(Date.now() - INITIAL_IMPORT_WINDOW_DAYS_PAST * 86400000).toISOString(),
      });
    } else {
      throw error;
    }
  }

  const freshById = new Map(result.events.map((e) => [e.id, e]));

  const { data: linkRows, error: linkError } = await supabase
    .from("calendar_sync_events")
    .select("*, events(updated_at)")
    .eq("connection_id", connectionId)
    .eq("google_calendar_id", googleCalendarId);
  if (linkError) throw linkError;

  type LinkRowWithEvent = SyncEventRow & { events: { updated_at: string } | null };
  const linkByGoogleId = new Map((linkRows as LinkRowWithEvent[]).map((r) => [r.google_event_id, r]));

  const allGoogleIds = new Set<string>([...freshById.keys(), ...linkByGoogleId.keys()]);

  for (const googleEventId of allGoogleIds) {
    const fresh = freshById.get(googleEventId);
    const link = linkByGoogleId.get(googleEventId);

    const googleDeleted = fresh ? fresh.status === "cancelled" : false;
    const googleUpdatedAt = fresh ? (googleDeleted ? null : fresh.updated ?? null) : (link?.google_updated_at ?? null);
    const localUpdatedAt = link?.events?.updated_at ?? null;

    // Brand-new Google event we've never seen: import it.
    if (fresh && !link && !googleDeleted) {
      await importNewGoogleEvent(supabase, coupleId, connectionId, googleCalendarId, fresh);
      summary.imported += 1;
      continue;
    }

    if (!link) continue; // cancelled event we never imported — nothing to do

    const action = reconcile({
      googleUpdatedAt,
      localUpdatedAt,
      lastSyncedGoogleUpdatedAt: link.google_updated_at,
      lastSyncedLocalUpdatedAt: link.internal_updated_at,
    });

    await applyAction(supabase, accessToken, coupleId, googleCalendarId, link, fresh, action, summary);
  }

  const newSyncToken = result.nextSyncToken;
  if (newSyncToken) {
    await supabase
      .from("google_calendar_selections")
      .update({ sync_token: newSyncToken })
      .eq("connection_id", connectionId)
      .eq("google_calendar_id", googleCalendarId);
  }
}

async function importNewGoogleEvent(
  supabase: TypedClient,
  coupleId: string,
  connectionId: string,
  googleCalendarId: string,
  fresh: NonNullable<ReturnType<Map<string, import("@/lib/google/calendar-client").GoogleEvent>["get"]>>,
): Promise<void> {
  const mapped = googleEventToInternalEvent(fresh);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida durante a importação.");

  const { data: newEvent, error: eventError } = await supabase
    .from("events")
    .insert({ couple_id: coupleId, created_by: user.id, visibility: "shared", ...mapped })
    .select()
    .single();
  if (eventError) throw eventError;

  const { error: linkError } = await supabase.from("calendar_sync_events").insert({
    couple_id: coupleId,
    connection_id: connectionId,
    internal_event_id: newEvent.id,
    google_calendar_id: googleCalendarId,
    google_event_id: fresh.id,
    etag: fresh.etag ?? null,
    google_updated_at: fresh.updated ?? null,
    internal_updated_at: newEvent.updated_at,
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
  });
  if (linkError) throw linkError;
}

async function applyAction(
  supabase: TypedClient,
  accessToken: string,
  coupleId: string,
  googleCalendarId: string,
  link: SyncEventRow,
  fresh: import("@/lib/google/calendar-client").GoogleEvent | undefined,
  action: ReturnType<typeof reconcile>,
  summary: SyncSummary,
): Promise<void> {
  const now = new Date().toISOString();

  switch (action.type) {
    case "noop":
      return;

    case "apply_remote_to_local": {
      if (!fresh) return;
      const mapped = googleEventToInternalEvent(fresh);
      const { data: updated, error } = await supabase
        .from("events")
        .update(mapped)
        .eq("id", link.internal_event_id!)
        .select("updated_at")
        .single();
      if (error) throw error;
      await supabase
        .from("calendar_sync_events")
        .update({ google_updated_at: fresh.updated ?? null, internal_updated_at: updated.updated_at, sync_status: "synced", last_synced_at: now, last_error: null })
        .eq("id", link.id);
      summary.updatedLocal += 1;
      return;
    }

    case "apply_local_to_remote": {
      const { data: localEvent, error: fetchError } = await supabase.from("events").select("*").eq("id", link.internal_event_id!).single();
      if (fetchError) throw fetchError;
      const googleBody = internalEventToGoogleEvent(localEvent);
      const updatedGoogle = await updateEvent(accessToken, googleCalendarId, link.google_event_id, googleBody);
      await supabase
        .from("calendar_sync_events")
        .update({ google_updated_at: updatedGoogle.updated ?? null, internal_updated_at: localEvent.updated_at, sync_status: "synced", last_synced_at: now, last_error: null })
        .eq("id", link.id);
      summary.updatedRemote += 1;
      return;
    }

    case "delete_local": {
      await supabase.from("events").delete().eq("id", link.internal_event_id!);
      summary.deletedLocal += 1;
      return;
    }

    case "delete_remote": {
      await deleteEvent(accessToken, googleCalendarId, link.google_event_id);
      await supabase.from("calendar_sync_events").delete().eq("id", link.id);
      summary.deletedRemote += 1;
      return;
    }

    case "recreate_remote_from_local": {
      const { data: localEvent, error } = await supabase.from("events").select("*").eq("id", link.internal_event_id!).single();
      if (error) throw error;
      const created = await insertEvent(accessToken, googleCalendarId, internalEventToGoogleEvent(localEvent));
      await supabase
        .from("calendar_sync_events")
        .update({
          google_event_id: created.id,
          google_updated_at: created.updated ?? null,
          internal_updated_at: localEvent.updated_at,
          sync_status: "conflict",
          last_error: "Evento removido no Google, mas editado no app: recriado no Google Calendar.",
          last_synced_at: now,
        })
        .eq("id", link.id);
      summary.conflicts += 1;
      return;
    }

    case "recreate_local_from_remote": {
      if (!fresh) return;
      const mapped = googleEventToInternalEvent(fresh);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: recreated, error } = await supabase
        .from("events")
        .insert({ couple_id: coupleId, created_by: user?.id ?? "", visibility: "shared", ...mapped })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("calendar_sync_events")
        .update({
          internal_event_id: recreated.id,
          google_updated_at: fresh.updated ?? null,
          internal_updated_at: recreated.updated_at,
          sync_status: "conflict",
          last_error: "Evento removido no app, mas editado no Google: restaurado a partir do Google Calendar.",
          last_synced_at: now,
        })
        .eq("id", link.id);
      summary.conflicts += 1;
      return;
    }

    case "conflict_remote_wins": {
      if (!fresh) return;
      const mapped = googleEventToInternalEvent(fresh);
      const { data: updated, error } = await supabase.from("events").update(mapped).eq("id", link.internal_event_id!).select("updated_at").single();
      if (error) throw error;
      await supabase
        .from("calendar_sync_events")
        .update({
          google_updated_at: fresh.updated ?? null,
          internal_updated_at: updated.updated_at,
          sync_status: "conflict",
          last_error: "Editado nos dois lados ao mesmo tempo — a versão mais recente (Google) foi mantida.",
          last_synced_at: now,
        })
        .eq("id", link.id);
      summary.conflicts += 1;
      return;
    }

    case "conflict_local_wins": {
      const { data: localEvent, error } = await supabase.from("events").select("*").eq("id", link.internal_event_id!).single();
      if (error) throw error;
      const updatedGoogle = await updateEvent(accessToken, googleCalendarId, link.google_event_id, internalEventToGoogleEvent(localEvent));
      await supabase
        .from("calendar_sync_events")
        .update({
          google_updated_at: updatedGoogle.updated ?? null,
          internal_updated_at: localEvent.updated_at,
          sync_status: "conflict",
          last_error: "Editado nos dois lados ao mesmo tempo — a versão mais recente (app) foi mantida.",
          last_synced_at: now,
        })
        .eq("id", link.id);
      summary.conflicts += 1;
      return;
    }
  }
}

/**
 * Pushes a local mutation to Google immediately (called from the events
 * service right after a Supabase write) so the round trip feels instant
 * instead of waiting for the next manual sync. Failures are swallowed into
 * the link's error state — the next `syncNow` retries automatically.
 */
export async function pushLocalEventChange(
  supabase: TypedClient,
  connectionId: string,
  accessToken: string,
  link: SyncEventRow,
): Promise<void> {
  try {
    const { data: localEvent, error } = await supabase.from("events").select("*").eq("id", link.internal_event_id!).maybeSingle();

    if (!localEvent) {
      await deleteEvent(accessToken, link.google_calendar_id, link.google_event_id);
      await supabase.from("calendar_sync_events").delete().eq("id", link.id);
      return;
    }
    if (error) throw error;

    const updated = await updateEvent(accessToken, link.google_calendar_id, link.google_event_id, internalEventToGoogleEvent(localEvent));
    await supabase
      .from("calendar_sync_events")
      .update({ google_updated_at: updated.updated ?? null, internal_updated_at: localEvent.updated_at, sync_status: "synced", last_error: null, last_synced_at: new Date().toISOString() })
      .eq("id", link.id);
  } catch (error) {
    await supabase
      .from("calendar_sync_events")
      .update({ sync_status: "error", last_error: error instanceof Error ? error.message : "Erro ao sincronizar com o Google" })
      .eq("id", link.id);
  }
}

export { ensureValidAccessToken };
