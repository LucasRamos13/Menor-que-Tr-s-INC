"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { addContribution } from "@/services/finance/goals-service";
import { goalContributionSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { todayISODate } from "@/lib/dates";
import type { Tables } from "@/types/database";

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Tables<"financial_goals"> | null;
  userId: string;
  onSaved?: () => void;
}

export function ContributionDialog({ open, onOpenChange, goal, userId, onSaved }: ContributionDialogProps) {
  const [amountCents, setAmountCents] = useState(0);
  const [date, setDate] = useState(todayISODate());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
    const parsed = goalContributionSchema.safeParse({ goal_id: goal.id, amount_cents: amountCents, date, note: note || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique o valor.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await addContribution(supabase, userId, parsed.data);
      toast.success("✓ Contribuição registrada");
      onOpenChange(false);
      onSaved?.();
      setAmountCents(0);
      setNote("");
    } catch (error) {
      toast.error(logAndFormat(error, "add-contribution", "Não foi possível registrar a contribuição."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Contribuir para {goal?.icon} {goal?.name}</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="contrib-amount">Valor</Label>
          <CurrencyInput id="contrib-amount" valueCents={amountCents} onChangeCents={setAmountCents} />
        </div>
        <div>
          <Label htmlFor="contrib-date">Data</Label>
          <Input id="contrib-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="contrib-note">Observação</Label>
          <Input id="contrib-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || amountCents <= 0}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
