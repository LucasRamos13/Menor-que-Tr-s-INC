"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { createRecurringTransaction, deleteRecurringTransaction } from "@/services/finance/recurring-service";
import { recurringTransactionSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";
import { formatDate, todayISODate } from "@/lib/dates";
import type { RecurrenceFrequency, Tables } from "@/types/database";

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = { daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

interface RecurringManagerProps {
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  recurring: Tables<"recurring_transactions">[];
  members: { id: string; fullName: string | null }[];
}

export function RecurringManager({ coupleId, userId, accounts, categories, recurring, members }: RecurringManagerProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Tables<"recurring_transactions"> | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteRecurringTransaction(supabase, deleting.id);
      toast.success("Recorrência excluída");
      router.refresh();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-recurring"));
    }
  }

  return (
    <div className="space-y-3">
      {recurring.length === 0 ? (
        <EmptyState icon={Repeat} title="Nenhuma recorrência cadastrada" description="Ex: aluguel todo dia 10, salário todo dia 5." />
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {recurring.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{r.description}</p>
                <p className="text-xs text-slate-400">
                  {FREQUENCY_LABELS[r.frequency]} · desde {formatDate(r.start_date)}
                  {!r.is_active && (
                    <Badge variant="secondary" className="ml-2">
                      Inativa
                    </Badge>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${r.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {r.type === "income" ? "+" : "-"} {centsToBRL(r.amount_cents)}
                </span>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setDeleting(r)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova recorrência
      </Button>

      <RecurringFormDialog open={open} onOpenChange={setOpen} coupleId={coupleId} userId={userId} accounts={accounts} categories={categories} members={members} onSaved={() => router.refresh()} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir recorrência?"
        description="As próximas ocorrências deixarão de ser geradas. Transações já criadas não são removidas."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RecurringFormDialog({
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
  members: { id: string; fullName: string | null }[];
  onSaved: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setAccountId(accounts.find((a) => a.is_active)?.id ?? "");
  }, [open, accounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = recurringTransactionSchema.safeParse({
      account_id: accountId,
      type,
      amount_cents: amountCents,
      description,
      category_id: categoryId || null,
      frequency,
      interval_count: 1,
      day_of_month: frequency === "monthly" ? Number(startDate.slice(8, 10)) : null,
      start_date: startDate,
      end_date: endDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await createRecurringTransaction(supabase, coupleId, userId, parsed.data);
      toast.success("✓ Recorrência criada");
      onOpenChange(false);
      onSaved();
      setDescription("");
      setAmountCents(0);
    } catch (error) {
      toast.error(logAndFormat(error, "create-recurring", "Não foi possível criar a recorrência."));
    } finally {
      setSaving(false);
    }
  }

  const relevantCategories = categories.filter((c) => c.kind === "both" || c.kind === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Nova recorrência</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${type === t ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"}`}
            >
              {t === "expense" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="rec-desc">Descrição</Label>
          <Input id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aluguel" required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="rec-amount">Valor</Label>
            <CurrencyInput id="rec-amount" valueCents={amountCents} onChangeCents={setAmountCents} />
          </div>
          <div>
            <Label htmlFor="rec-account">Conta</Label>
            <Select id="rec-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="rec-frequency">Frequência</Label>
            <Select id="rec-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="rec-category">Categoria</Label>
            <Select id="rec-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="rec-start">Data inicial</Label>
            <Input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rec-end">Data final (opcional)</Label>
            <Input id="rec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
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
