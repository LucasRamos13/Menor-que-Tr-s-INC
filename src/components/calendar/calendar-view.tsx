"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Settings, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/dates";
import { EventFormDialog } from "./event-form-dialog";
import type { Tables } from "@/types/database";

interface CalendarViewProps {
  coupleId: string;
  userId: string;
  events: Tables<"events">[];
  members: { id: string; fullName: string | null }[];
  hasGoogleConnection: boolean;
  connectionId: string | null;
  syncTargets: { google_calendar_id: string; calendar_summary: string }[];
}

export function CalendarView({ coupleId, userId, events, members, hasGoogleConnection, connectionId, syncTargets }: CalendarViewProps) {
  const [view, setView] = useState<"month" | "agenda">("month");
  const [cursor, setCursor] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"events"> | null>(null);
  const router = useRouter();

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Tables<"events">[]>();
    for (const e of events) {
      const key = e.start_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const agendaEvents = [...events]
    .filter((e) => new Date(e.end_at) >= new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(event: Tables<"events">) {
    setEditing(event);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {!hasGoogleConnection && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
          <span className="text-slate-500">🔴 Google Calendar não conectado</span>
          <Link href="/settings/google-calendar" className="flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            <Settings className="h-3.5 w-3.5" /> Conectar
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          <button onClick={() => setView("month")} className={cn("rounded-md px-3 py-1 text-sm", view === "month" && "bg-slate-100 dark:bg-slate-800")}>
            Mês
          </button>
          <button onClick={() => setView("agenda")} className={cn("rounded-md px-3 py-1 text-sm", view === "agenda" && "bg-slate-100 dark:bg-slate-800")}>
            Agenda
          </button>
        </div>

        {view === "month" && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">{format(cursor, "MMMM yyyy", { locale: ptBR })}</span>
            <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo evento
        </Button>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="bg-slate-50 p-2 text-center text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const today = isSameDay(day, new Date());
            return (
              <div key={key} className={cn("min-h-24 bg-white p-1.5 dark:bg-slate-900", !inMonth && "bg-slate-50/50 dark:bg-slate-900/40")}>
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", today && "bg-emerald-600 font-semibold text-white", !inMonth && "text-slate-300 dark:text-slate-700")}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <button key={e.id} onClick={() => openEdit(e)} className="block w-full truncate rounded bg-emerald-50 px-1 py-0.5 text-left text-[11px] text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && <p className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 2} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {agendaEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              Nenhum compromisso futuro.
            </div>
          ) : (
            agendaEvents.map((e) => (
              <button key={e.id} onClick={() => openEdit(e)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  {e.location && <p className="truncate text-xs text-slate-400">{e.location}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <p>{format(new Date(e.start_at), "dd/MM")}</p>
                  {!e.all_day && <p>{formatTime(e.start_at)}</p>}
                  {e.all_day && <Badge variant="secondary">Dia todo</Badge>}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        coupleId={coupleId}
        userId={userId}
        members={members}
        event={editing}
        connectionId={connectionId}
        syncTargets={syncTargets}
        onSaved={() => router.refresh()}
        onDeleted={() => {
          toast.success("Evento excluído");
          router.refresh();
        }}
      />
    </div>
  );
}
