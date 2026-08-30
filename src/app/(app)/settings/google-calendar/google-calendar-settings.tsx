"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Unplug, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDateTime } from "@/lib/dates";
import type { Database } from "@/types/database";

type Connection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];
type Selection = Database["public"]["Tables"]["google_calendar_selections"]["Row"];

interface GoogleCalendarEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

interface GoogleCalendarSettingsProps {
  connection: Connection | null;
  selections: Selection[];
  justConnected: boolean;
  connectError?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Você cancelou a autorização no Google.",
  invalid_state: "A tentativa de conexão expirou. Tente novamente.",
  connection_failed: "Não foi possível concluir a conexão com o Google. Tente novamente.",
};

export function GoogleCalendarSettings({ connection, selections, justConnected, connectError }: GoogleCalendarSettingsProps) {
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(selections.map((s) => [s.google_calendar_id, s.is_syncing])));
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (justConnected) toast.success("Google Calendar conectado!");
    if (connectError) toast.error(ERROR_MESSAGES[connectError] ?? "Não foi possível conectar ao Google.");
  }, [justConnected, connectError]);

  useEffect(() => {
    if (!connection) return;
    setLoadingCalendars(true);
    fetch("/api/google/calendar/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const list: GoogleCalendarEntry[] = data.calendars ?? [];
        setCalendars(list);
        // Pre-check the primary calendar the first time (no saved selection
        // yet) so it isn't missed in favor of more eye-catching entries like
        // a public "Feriados no Brasil" calendar.
        setChecked((prev) => {
          const next = { ...prev };
          for (const cal of list) {
            if (!(cal.id in next)) next[cal.id] = !!cal.primary;
          }
          return next;
        });
      })
      .catch(() => toast.error("Não foi possível carregar a lista de calendários do Google."))
      .finally(() => setLoadingCalendars(false));
  }, [connection]);

  async function handleSaveSelection() {
    setSavingSelection(true);
    try {
      const payload = calendars.map((c) => ({ google_calendar_id: c.id, calendar_summary: c.summary, is_syncing: !!checked[c.id] }));
      const res = await fetch("/api/google/calendar/selections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selections: payload }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("✓ Calendários atualizados");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar os calendários selecionados.");
    } finally {
      setSavingSelection(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/google/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`✓ Sincronizado — ${data.summary.imported} importados, ${data.summary.updatedLocal + data.summary.updatedRemote} atualizados`);
      router.refresh();
    } catch {
      toast.error("Não foi possível sincronizar com o Google Calendar agora.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/google/calendar/disconnect", { method: "POST" });
      toast.success("Google Calendar desconectado");
      router.refresh();
    } catch {
      toast.error("Não foi possível desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔴 Não conectado</CardTitle>
          <CardDescription>Conecte sua conta Google para importar e sincronizar sua agenda automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/google/oauth/start">Conectar Google Calendar</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-emerald-600" /> Conectado
          </CardTitle>
          <CardDescription>{connection.google_account_email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {connection.last_sync_status === "error" ? (
            <p className="text-red-600">🔴 Sincronização pausada: {connection.last_sync_error}</p>
          ) : connection.last_synced_at ? (
            <p className="text-slate-500">🟢 Última sincronização: {formatDateTime(connection.last_synced_at)}</p>
          ) : (
            <p className="text-slate-400">Ainda não sincronizado.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={handleSyncNow} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={disconnecting}>
              <Unplug className="h-4 w-4" /> Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendários para sincronizar</CardTitle>
          <CardDescription>Escolha quais calendários do Google devem aparecer no app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingCalendars ? (
            <p className="text-sm text-slate-400">Carregando calendários...</p>
          ) : calendars.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum calendário encontrado.</p>
          ) : (
            <>
              {calendars.map((cal) => (
                <label key={cal.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!checked[cal.id]} onChange={(e) => setChecked((prev) => ({ ...prev, [cal.id]: e.target.checked }))} />
                  {cal.summary} {cal.primary && <Badge variant="secondary">Principal</Badge>}
                </label>
              ))}
              <Button size="sm" onClick={handleSaveSelection} disabled={savingSelection}>
                {savingSelection ? "Salvando..." : "Salvar seleção"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Desconectar Google Calendar?"
        description="Os eventos já importados continuam no app, mas deixarão de ser sincronizados até você reconectar."
        confirmLabel="Desconectar"
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
