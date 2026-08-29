"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { createInstallmentPlan, deleteInstallmentPlan } from "@/services/finance/installments-service";
import { installmentSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";
import { formatDate, todayISODate } from "@/lib/dates";
import type { Tables } from "@/types/database";

interface InstallmentsManagerProps {
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  plans: Tables<"installments">[];
}

export function InstallmentsManager({ coupleId, userId, accounts, categories, plans }: InstallmentsManagerProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Tables<"installments"> | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteInstallmentPlan(supabase, deleting.id);
      toast.success("Parcelamento excluído");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-installment"));
    }
  }

  return (
    <div className="space-y-3">
      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhum parcelamento cadastrado" description="Ex: compra de R$ 1.200 em 12x de R$ 100." />
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{p.description}</p>
                <p className="text-xs text-slate-400">
                  {p.installment_count}x de {centsToBRL(Math.round(p.total_amount_cents / p.installment_count))} · desde {formatDate(p.first_due_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{centsToBRL(p.total_amount_cents)}</span>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo parcelamento
      </Button>

      <InstallmentFormDialog open={open} onOpenChange={setOpen} coupleId={coupleId} userId={userId} accounts={accounts} categories={categories} onSaved={() => router.refresh()} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir parcelamento?"
        description="As parcelas futuras ainda não pagas serão removidas. Parcelas já pagas continuam no histórico."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function InstallmentFormDialog({
  open,
  onOpenChange,
  coupleId,
  userId,
  accounts,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [totalCents, setTotalCents] = useState(0);
  const [count, setCount] = useState(2);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [firstDueDate, setFirstDueDate] = useState(todayISODate());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setAccountId(accounts.find((a) => a.is_active)?.id ?? "");
  }, [open, accounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = installmentSchema.safeParse({
      account_id: accountId,
      description,
      total_amount_cents: totalCents,
      installment_count: count,
      first_due_date: firstDueDate,
      category_id: categoryId || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await createInstallmentPlan(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Parcelamento criado");
      onOpenChange(false);
      onSaved();
      setDescription("");
      setTotalCents(0);
    } catch (error) {
      toast.error(logAndFormat(error, "create-installment", "Não foi possível criar o parcelamento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Novo parcelamento</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="inst-desc">Descrição</Label>
          <Input id="inst-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Geladeira nova" required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inst-total">Valor total</Label>
            <CurrencyInput id="inst-total" valueCents={totalCents} onChangeCents={setTotalCents} />
          </div>
          <div>
            <Label htmlFor="inst-count">Nº de parcelas</Label>
            <Input id="inst-count" type="number" min={2} max={120} value={count} onChange={(e) => setCount(Number(e.target.value))} required />
          </div>
        </div>
        {totalCents > 0 && count > 1 && (
          <p className="text-xs text-slate-400">
            {count}x de {centsToBRL(Math.floor(totalCents / count))}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inst-account">Conta / cartão</Label>
            <Select id="inst-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="" disabled>
                Selecione
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="inst-category">Categoria</Label>
            <Select id="inst-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="inst-date">Primeira parcela</Label>
          <Input id="inst-date" type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} required />
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
