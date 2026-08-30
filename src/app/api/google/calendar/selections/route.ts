import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnection } from "@/services/calendar/google-sync-service";
import { logAndFormat } from "@/lib/errors";


interface SelectionInput {
  google_calendar_id: string;
  calendar_summary: string;
  is_syncing: boolean;
  accessRole?: string;
}

/** Google's accessRole values that mean the calendar can never accept writes from us. */
const READ_ONLY_ROLES = new Set(["reader", "freeBusyReader"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const connection = await getConnection(supabase, user.id);
    if (!connection) throw new Error("Nenhuma conta Google conectada.");

    const { selections }: { selections: SelectionInput[] } = await request.json();

    const { error } = await supabase
      .from("google_calendar_selections")
      .upsert(
        selections.map(({ accessRole, ...s }) => ({
          connection_id: connection.id,
          is_read_only: !!accessRole && READ_ONLY_ROLES.has(accessRole),
          ...s,
        })),
        { onConflict: "connection_id,google_calendar_id" },
      );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: logAndFormat(error, "google-calendar-selections", "Não foi possível salvar os calendários selecionados.") }, { status: 500 });
  }
}
