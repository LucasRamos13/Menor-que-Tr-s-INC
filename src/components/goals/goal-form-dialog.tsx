"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { createGoal, updateGoal } from "@/services/finance/goals-service";
import { financialGoalSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import type { Tables, Visibility } from "@/types/database";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  userId: string;
  goal?: Tables<"financial_goals"> | null;
  members: { id: string; fullName: string | null }[];
  onSaved?: () => void;
}

const EMOJI_OPTIONS = ["🎯", "💍", "🏠", "🚗", "✈️", "🎓", "💰", "🛋️"];

export function GoalFormDialog({ open, onOpenChange, coupleId, userId, goal, members, onSaved }: GoalFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetAmountCents, setTargetAmountCents] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("shared");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setDescription(goal?.description ?? "");
    setIcon(goal?.icon ?? "🎯");
    setTargetAmountCents(goal?.target_amount_cents ?? 0);
    setTargetDate(goal?.target_date ?? "");
    setVisibility(goal?.visibility ?? "shared");
    setOwnerId(goal?.owner_id ?? "");
  }, [open, goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = financialGoalSchema.safeParse({
      name,
      description: description || null,
      icon,
      target_amount_cents: targetAmountCents,
      target_date: targetDate || null,
      visibility,
      owner_id: visibility === "personal" ? ownerId : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      if (goal) await updateGoal(supabase, goal.id, parsed.data);
      else await createGoal(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Salvo");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(logAndFormat(error, "goal-form", "Não foi possível salvar o objetivo."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{goal ? "Editar objetivo" : "Novo objetivo"}</DialogTitle>
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
                onClick={() => setIcon(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${icon === e ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="goal-name">Nome</Label>
          <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Viagem dos sonhos" required autoFocus />
        </div>
        <div>
          <Label htmlFor="goal-description">Descrição</Label>
          <Textarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="goal-target">Meta</Label>
            <CurrencyInput id="goal-target" valueCents={targetAmountCents} onChangeCents={setTargetAmountCents} />
          </div>
          <div>
            <Label htmlFor="goal-date">Data desejada</Label>
            <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="goal-visibility">Visibilidade</Label>
            <Select id="goal-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="shared">Compartilhado</option>
              <option value="personal">Pessoal</option>
            </Select>
          </div>
          {visibility === "personal" && (
            <div>
              <Label htmlFor="goal-owner">Dono(a)</Label>
              <Select id="goal-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
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
