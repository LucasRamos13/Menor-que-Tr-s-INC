"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { upsertBudget, deleteBudget } from "@/services/finance/budgets-service";
import { budgetSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";
import type { BudgetProgress } from "@/services/finance/budgets";
import type { Tables } from "@/types/database";

interface BudgetsManagerProps {
  coupleId: string;
  year: number;
  month: number;
  categories: Tables<"categories">[];
  budgets: Tables<"budgets">[];
  progress: BudgetProgress[];
}

export function BudgetsManager({ coupleId, year, month, categories, budgets, progress }: BudgetsManagerProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [limitCents, setLimitCents] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const progressByCategory = new Map(progress.map((p) => [p.categoryId, p]));
  const usedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = categories.filter((c) => c.kind !== "income" && !usedCategoryIds.has(c.id));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = budgetSchema.safeParse({ category_id: categoryId, year, month, limit_cents: limitCents });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await upsertBudget(supabase, coupleId, parsed.data);
      toast.success("✓ Orçamento salvo");
      setOpen(false);
      setCategoryId("");
      setLimitCents(0);
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "upsert-budget", "Não foi possível salvar o orçamento."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const supabase = createClient();
      await deleteBudget(supabase, id);
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-budget"));
    }
  }

  return (
    <div className="space-y-3">
      {budgets.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Nenhum orçamento definido" description="Ex: Alimentação R$ 800, Lazer R$ 300." />
      ) : (
        <div className="space-y-4">
          {budgets.map((b) => {
            const category = categoryById.get(b.category_id);
            const p = progressByCategory.get(b.category_id);
            const pct = p?.percentage ?? 0;
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    {category?.icon} {category?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                      {centsToBRL(p?.spentCents ?? 0)} / {centsToBRL(b.limit_cents)}
                    </span>
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Progress value={pct} indicatorClassName={p?.status === "warning" ? "bg-amber-500" : undefined} />
                <p className="mt-1 text-xs text-slate-400">{pct}% utilizado</p>
              </div>
            );
          })}
        </div>
      )}

      {availableCategories.length > 0 && (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo orçamento
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
          <DialogCloseButton onClick={() => setOpen(false)} />
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <Label htmlFor="budget-category">Categoria</Label>
            <Select id="budget-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="" disabled>
                Selecione
              </option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="budget-limit">Limite mensal</Label>
            <CurrencyInput id="budget-limit" valueCents={limitCents} onChangeCents={setLimitCents} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
