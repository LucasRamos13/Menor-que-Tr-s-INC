"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { createEvent, updateEvent, deleteEvent } from "@/services/calendar/events-service";
import { eventSchema } from "@/validation/calendar";
import { logAndFormat } from "@/lib/errors";
import type { Tables, Visibility } from "@/types/database";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  userId: string;
  members: { id: string; fullName: string | null }[];
  event?: Tables<"events"> | null;
  connectionId: string | null;
  syncTargets: { google_calendar_id: string; calendar_summary: string }[];
  onSaved?: () => void;
  onDeleted?: () => void;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function EventFormDialog({ open, onOpenChange, coupleId, userId, members, event, connectionId, syncTargets, onSaved, onDeleted }: EventFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("shared");
  const [ownerId, setOwnerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [targetCalendarId, setTargetCalendarId] = useState(syncTargets[0]?.google_calendar_id ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setAllDay(event.all_day);
      setStartAt(event.all_day ? event.start_at.slice(0, 10) : toLocalInputValue(event.start_at));
      setEndAt(event.all_day ? event.end_at.slice(0, 10) : toLocalInputValue(event.end_at));
      setVisibility(event.visibility);
      setOwnerId(event.owner_id ?? "");
    } else {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 3600000);
      setTitle("");
      setDescription("");
      setLocation("");
      setAllDay(false);
      setStartAt(toLocalInputValue(now.toISOString()));
      setEndAt(toLocalInputValue(inOneHour.toISOString()));
      setVisibility("shared");
      setOwnerId("");
      setSyncToGoogle(false);
    }
    setParticipantIds([]);
  }, [open, event]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startISO = allDay ? `${startAt}T00:00:00.000Z` : new Date(startAt).toISOString();
    const endISO = allDay ? `${endAt}T00:00:00.000Z` : new Date(endAt).toISOString();

    const parsed = eventSchema.safeParse({
      title,
      description: description || null,
      location: location || null,
      start_at: startISO,
      end_at: endISO,
      all_day: allDay,
      visibility,
      owner_id: visibility === "personal" ? ownerId : null,
      participant_ids: participantIds,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos do evento.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (event) {
        await updateEvent(supabase, event.id, parsed.data);
      } else {
        await createEvent(
          supabase,
          coupleId,
          userId,
          parsed.data,
          syncToGoogle && connectionId && targetCalendarId ? { connectionId, googleCalendarId: targetCalendarId } : undefined,
        );
      }
      toast.success("✓ Salvo" + (syncToGoogle ? " e sincronizado" : ""));
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(logAndFormat(error, "event-form", "Não foi possível salvar o evento."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    try {
      const supabase = createClient();
      await deleteEvent(supabase, event.id);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-event", "Não foi possível excluir o evento."));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogCloseButton onClick={() => onOpenChange(false)} />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            Dia inteiro
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-start">Início</Label>
              <Input id="ev-start" type={allDay ? "date" : "datetime-local"} value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ev-end">Término</Label>
              <Input id="ev-end" type={allDay ? "date" : "datetime-local"} value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label htmlFor="ev-location">Local</Label>
            <Input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" />
          </div>

          <div>
            <Label htmlFor="ev-description">Descrição</Label>
            <Textarea id="ev-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {members.length > 0 && (
            <div>
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-3">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={participantIds.includes(m.id)} onChange={() => toggleParticipant(m.id)} />
                    {m.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-visibility">Visibilidade</Label>
              <Select id="ev-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                <option value="shared">Compartilhado</option>
                <option value="personal">Pessoal</option>
              </Select>
            </div>
            {visibility === "personal" && (
              <div>
                <Label htmlFor="ev-owner">Dono(a)</Label>
                <Select id="ev-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {!event && connectionId && syncTargets.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={syncToGoogle} onChange={(e) => setSyncToGoogle(e.target.checked)} />
                Sincronizar com o Google Calendar
              </label>
              {syncToGoogle && syncTargets.length > 1 && (
                <Select className="mt-2" value={targetCalendarId} onChange={(e) => setTargetCalendarId(e.target.value)}>
                  {syncTargets.map((t) => (
                    <option key={t.google_calendar_id} value={t.google_calendar_id}>
                      {t.calendar_summary}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          <DialogFooter className="justify-between sm:justify-between">
            {event ? (
              <Button type="button" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir evento?"
        description="Este evento será excluído permanentemente, inclusive do Google Calendar caso esteja sincronizado."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </>
  );
}
