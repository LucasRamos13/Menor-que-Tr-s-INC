import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectGoogle, setSyncEnabled } from "@/services/calendar/google-sync-service";
import { logAndFormat } from "@/lib/errors";


export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    await disconnectGoogle(supabase, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: logAndFormat(error, "google-calendar-disconnect", "Não foi possível desconectar o Google Calendar.") }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { enabled }: { enabled: boolean } = await request.json();
    await setSyncEnabled(supabase, user.id, enabled);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: logAndFormat(error, "google-calendar-toggle", "Não foi possível atualizar a sincronização.") }, { status: 500 });
  }
}
