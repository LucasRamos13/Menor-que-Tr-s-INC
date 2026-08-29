import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listEventsInRange } from "@/services/calendar/events-service";
import { getConnection } from "@/services/calendar/google-sync-service";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const now = new Date();
  const fromISO = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const toISO = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  const [events, connection] = await Promise.all([
    listEventsInRange(supabase, couple.coupleId, { fromISO, toISO }),
    getConnection(supabase, user!.id),
  ]);

  const syncTargets = connection
    ? (
        await supabase
          .from("google_calendar_selections")
          .select("google_calendar_id, calendar_summary")
          .eq("connection_id", connection.id)
          .eq("is_syncing", true)
      ).data ?? []
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Calendário</h1>
      </div>
      <CalendarView
        coupleId={couple.coupleId}
        userId={user!.id}
        events={events}
        members={couple.members}
        hasGoogleConnection={!!connection}
        connectionId={connection?.id ?? null}
        syncTargets={syncTargets}
      />
    </div>
  );
}
