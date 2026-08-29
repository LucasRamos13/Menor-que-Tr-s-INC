"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { createImportantDate, updateImportantDate, deleteImportantDate, type ImportantDateWithCountdown } from "@/services/calendar/important-dates-service";
import { importantDateSchema } from "@/validation/calendar";
import { logAndFormat } from "@/lib/errors";
import { formatLongDate, todayISODate } from "@/lib/dates";

const EMOJI_OPTIONS = ["❤️", "💍", "🎂", "🏠", "📅", "🎉", "✈️"];

interface ImportantDatesBoardProps {
  coupleId: string;
  userId: string;
  dates: ImportantDateWithCountdown[];
}

export function ImportantDatesBoard({ coupleId, userId, dates }: ImportantDatesBoardProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ImportantDateWithCountdown | null>(null);
  const [deleting, setDeleting] = useState<ImportantDateWithCountdown | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteImportantDate(supabase, deleting.id);
      toast.success("Data excluída");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-important-date"));
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => { setEditing(null); setOpen(true); }}>
        <Plus className="h-4 w-4" /> Nova data
      </Button>

      {dates.length === 0 ? (
        <EmptyState icon={Heart} title="Nenhuma data cadastrada" description="Ex: aniversário de namoro, casamento, aniversários." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {dates.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="text-lg">
                  {d.emoji} {d.title}
                </p>
                <p className="text-xs text-slate-400">{formatLongDate(d.nextOccurrenceISO)}</p>
                {d.notes && <p className="mt-1 text-xs text-slate-400">{d.notes}</p>}
                <Badge variant={d.daysRemaining <= 7 ? "warning" : "secondary"} className="mt-2">
                  {d.daysRemaining === 0 ? "É hoje! 🎉" : d.daysRemaining < 0 ? "Já passou" : `Faltam ${d.daysRemaining} dias`}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditing(d); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImportantDateFormDialog open={open} onOpenChange={setOpen} coupleId={coupleId} userId={userId} date={editing} onSaved={() => router.refresh()} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir data?" description="Esta data importante será excluída permanentemente." confirmLabel="Excluir" onConfirm={handleDelete} />
    </div>
  );
}

function ImportantDateFormDialog({
  open,
  onOpenChange,
  coupleId,
  userId,
  date,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  coupleId: string;
  userId: string;
  date: ImportantDateWithCountdown | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("❤️");
  const [value, setValue] = useState(todayISODate());
  const [isRecurringYearly, setIsRecurringYearly] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(date?.title ?? "");
    setEmoji(date?.emoji ?? "❤️");
    setValue(date?.date ?? todayISODate());
    setIsRecurringYearly(date?.is_recurring_yearly ?? true);
    setNotes(date?.notes ?? "");
  }, [open, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = importantDateSchema.safeParse({ title, emoji, date: value, is_recurring_yearly: isRecurringYearly, notes: notes || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      if (date) await updateImportantDate(supabase, date.id, parsed.data);
      else await createImportantDate(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Salvo");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(logAndFormat(error, "important-date-form", "Não foi possível salvar a data."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{date ? "Editar data" : "Nova data importante"}</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Ícone</Label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${emoji === e ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="date-title">Título</Label>
          <Input id="date-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aniversário de namoro" required autoFocus />
        </div>
        <div>
          <Label htmlFor="date-value">Data</Label>
          <Input id="date-value" type="date" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isRecurringYearly} onChange={(e) => setIsRecurringYearly(e.target.checked)} />
          Repete todo ano
        </label>
        <div>
          <Label htmlFor="date-notes">Notas</Label>
          <Textarea id="date-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
