import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";


export interface SearchResult {
  type: "transaction" | "task" | "event" | "goal";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const couple = await getMyCoupleContext(supabase, user.id);
  if (!couple) return NextResponse.json({ results: [] });

  const like = `%${q}%`;

  const [transactions, tasks, events, goals] = await Promise.all([
    supabase.from("transactions").select("id, description, amount_cents").eq("couple_id", couple.coupleId).ilike("description", like).limit(5),
    supabase.from("tasks").select("id, title, status").eq("couple_id", couple.coupleId).ilike("title", like).limit(5),
    supabase.from("events").select("id, title, start_at").eq("couple_id", couple.coupleId).ilike("title", like).limit(5),
    supabase.from("financial_goals").select("id, name").eq("couple_id", couple.coupleId).ilike("name", like).limit(5),
  ]);

  const results: SearchResult[] = [
    ...(transactions.data ?? []).map((t) => ({ type: "transaction" as const, id: t.id, title: t.description, href: "/finance/transactions" })),
    ...(tasks.data ?? []).map((t) => ({ type: "task" as const, id: t.id, title: t.title, subtitle: t.status, href: "/tasks" })),
    ...(events.data ?? []).map((e) => ({ type: "event" as const, id: e.id, title: e.title, href: "/calendar" })),
    ...(goals.data ?? []).map((g) => ({ type: "goal" as const, id: g.id, title: g.name, href: "/goals" })),
  ];

  return NextResponse.json({ results });
}
