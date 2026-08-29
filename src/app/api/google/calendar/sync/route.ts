import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncNow } from "@/services/calendar/google-sync-service";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { logAndFormat } from "@/lib/errors";


/** Manual "Sincronizar agora" trigger — see docs/google-calendar.md for why there's no background polling. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const couple = await getMyCoupleContext(supabase, user.id);
    if (!couple) throw new Error("Você ainda não pertence a um casal.");

    const summary = await syncNow(supabase, couple.coupleId, user.id);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: logAndFormat(error, "google-calendar-sync", "Não foi possível sincronizar com o Google Calendar.") }, { status: 500 });
  }
}
