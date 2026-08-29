import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listAvailableGoogleCalendars } from "@/services/calendar/google-sync-service";
import { logAndFormat } from "@/lib/errors";


export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const calendars = await listAvailableGoogleCalendars(supabase, user.id);
    return NextResponse.json({ calendars });
  } catch (error) {
    return NextResponse.json({ error: logAndFormat(error, "google-calendar-list", "Não foi possível listar os calendários do Google.") }, { status: 500 });
  }
}
