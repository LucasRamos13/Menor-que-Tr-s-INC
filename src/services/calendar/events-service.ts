import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { EventInput } from "@/validation/calendar";
import { insertEvent, deleteEvent as deleteGoogleEvent } from "@/lib/google/calendar-client";
import { internalEventToGoogleEvent } from "./google-mapping";
import { getConnection, ensureValidAccessToken, pushLocalEventChange } from "./google-sync-service";

type TypedClient = SupabaseClient<Database>;

export interface EventFilters {
  fromISO?: string;
  toISO?: string;
}

export async function listEventsInRange(supabase: TypedClient, coupleId: string, filters: EventFilters = {}): Promise<Tables<"events">[]> {
  let query = supabase.from("events").select("*").eq("couple_id", coupleId);
  if (filters.fromISO) query = query.lte("start_at", filters.toISO ?? "9999-12-31");
  if (filters.fromISO) query = query.gte("end_at", filters.fromISO);
  const { data, error } = await query.order("start_at");
  if (error) throw error;
  return data;
}

export async function getUpcomingEvents(supabase: TypedClient, coupleId: string, limit = 5): Promise<Tables<"events">[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("couple_id", coupleId)
    .gte("start_at", new Date().toISOString())
    .order("start_at")
    .limit(limit);
  if (error) throw error;
  return data;
}

export interface GoogleSyncTarget {
  connectionId: string;
  googleCalendarId: string;
}

export async function createEvent(
  supabase: TypedClient,
  coupleId: string,
  userId: string,
  input: EventInput,
  syncTo?: GoogleSyncTarget,
): Promise<Tables<"events">> {
  const { participant_ids, ...eventFields } = input;

  const { data: event, error } = await supabase
    .from("events")
    .insert({ ...eventFields, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  if (participant_ids.length > 0) {
    await supabase.from("event_participants").insert(participant_ids.map((user_id) => ({ event_id: event.id, user_id })));
  }

  if (syncTo) {
    await linkAndPushToGoogle(supabase, coupleId, event, syncTo);
  }

  return event;
}

async function linkAndPushToGoogle(supabase: TypedClient, coupleId: string, event: Tables<"events">, target: GoogleSyncTarget): Promise<void> {
  try {
    const connection = await getConnection(supabase, event.created_by);
    if (!connection) return;
    const accessToken = await ensureValidAccessToken(supabase, connection);
    const created = await insertEvent(accessToken, target.googleCalendarId, internalEventToGoogleEvent(event));

    await supabase.from("calendar_sync_events").insert({
      couple_id: coupleId,
      connection_id: target.connectionId,
      internal_event_id: event.id,
      google_calendar_id: target.googleCalendarId,
      google_event_id: created.id,
      google_updated_at: created.updated ?? null,
      internal_updated_at: event.updated_at,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    });
  } catch (error) {
    // The local event already exists and is fully usable; sync can be retried later from Calendar settings.
    console.error("[events-service] failed to push new event to Google", error);
  }
}

export async function updateEvent(supabase: TypedClient, eventId: string, input: Partial<EventInput>): Promise<Tables<"events">> {
  const { participant_ids, ...eventFields } = input;

  const { data: event, error } = await supabase.from("events").update(eventFields).eq("id", eventId).select().single();
  if (error) throw error;

  if (participant_ids) {
    await supabase.from("event_participants").delete().eq("event_id", eventId);
    if (participant_ids.length > 0) {
      await supabase.from("event_participants").insert(participant_ids.map((user_id) => ({ event_id: eventId, user_id })));
    }
  }

  await pushIfLinked(supabase, eventId);
  return event;
}

async function pushIfLinked(supabase: TypedClient, eventId: string): Promise<void> {
  const { data: link } = await supabase.from("calendar_sync_events").select("*").eq("internal_event_id", eventId).maybeSingle();
  if (!link) return;

  const connection = await getConnectionById(supabase, link.connection_id);
  if (!connection || !connection.sync_enabled) return;

  const accessToken = await ensureValidAccessToken(supabase, connection);
  await pushLocalEventChange(supabase, link.connection_id, accessToken, link);
}

async function getConnectionById(supabase: TypedClient, connectionId: string) {
  const { data } = await supabase.from("google_calendar_connections").select("*").eq("id", connectionId).maybeSingle();
  return data;
}

export async function deleteEvent(supabase: TypedClient, eventId: string): Promise<void> {
  const { data: link } = await supabase.from("calendar_sync_events").select("*").eq("internal_event_id", eventId).maybeSingle();

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;

  if (link) {
    try {
      const connection = await getConnectionById(supabase, link.connection_id);
      if (connection) {
        const accessToken = await ensureValidAccessToken(supabase, connection);
        await deleteGoogleEvent(accessToken, link.google_calendar_id, link.google_event_id);
      }
    } catch (error) {
      console.error("[events-service] failed to delete linked Google event", error);
    }
  }
}
