import { createClient } from "@/lib/supabase/server";
import { getConnection } from "@/services/calendar/google-sync-service";
import { GoogleCalendarSettings } from "./google-calendar-settings";

export default async function GoogleCalendarSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const connection = await getConnection(supabase, user!.id);

  const selections = connection
    ? (await supabase.from("google_calendar_selections").select("*").eq("connection_id", connection.id)).data ?? []
    : [];

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Google Calendar</h1>
      <GoogleCalendarSettings connection={connection} selections={selections} justConnected={params.connected === "1"} connectError={params.error} />
    </div>
  );
}
