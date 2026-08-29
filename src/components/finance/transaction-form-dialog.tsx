"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/shared/currency-input";
import { createClient } from "@/lib/supabase/client";
import { createTransaction, updateTransaction } from "@/services/finance/transactions-service";
import { transactionSchema } from "@/validation/finance";
import { logAndFormat } from "@/lib/errors";
import { todayISODate } from "@/lib/dates";
import type { Tables, TransactionType } from "@/types/database";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  members: { id: string; fullName: string | null }[];
  transaction?: Tables<"transactions"> | null;
  defaultType?: TransactionType;
  onSaved?: () => void;
}

export function TransactionFormDialog({ open, onOpenChange, coupleId, userId, accounts, categories, members, transaction, defaultType = "expense", onSaved }: TransactionFormDialogProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAccountId(transaction.account_id);
      setTransferAccountId(transaction.transfer_account_id ?? "");
      setAmountCents(transaction.amount_cents);
      setDescription(transaction.description);
      setCategoryId(transaction.category_id ?? "");
      setResponsibleId(transaction.responsible_id ?? "");
      setDate(transaction.date);
      setIsPaid(transaction.is_paid);
      setNotes(transaction.notes ?? "");
    } else {
      setType(defaultType);
      setAccountId(accounts.find((a) => a.is_active)?.id ?? "");
      setTransferAccountId("");
      setAmountCents(0);
      setDescription("");
      setCategoryId("");
      setResponsibleId("");
      setDate(todayISODate());
      setIsPaid(true);
      setNotes("");
    }
  }, [open, transaction, defaultType, accounts]);

  const relevantCategories = categories.filter((c) => c.kind === "both" || c.kind === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = transactionSchema.safeParse({
      account_id: accountId,
      transfer_account_id: transferAccountId || null,
      type,
      amount_cents: amountCents,
      description,
      category_id: categoryId || null,
      responsible_id: responsibleId || null,
      date,
      is_paid: isPaid,
      notes: notes || null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos do formulário.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (transaction) {
        await updateTransaction(supabase, transaction.id, userId, parsed.data);
      } else {
        await createTransaction(supabase, coupleId, userId, parsed.data);
      }
      toast.success("✓ Salvo");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(logAndFormat(error, "transaction-form", "Não foi possível salvar a transação. Verifique sua conexão e tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{transaction ? "Editar transação" : "Nova transação"}</DialogTitle>
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${type === t ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
            >
              {t === "expense" ? "Despesa" : t === "income" ? "Receita" : "Transferência"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Valor</Label>
            <CurrencyInput id="amount" valueCents={amountCents} onChangeCents={setAmountCents} />
          </div>
          <div>
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Supermercado" required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="account">Conta</Label>
            <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
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
          {type === "transfer" ? (
            <div>
              <Label htmlFor="transfer-account">Para a conta</Label>
              <Select id="transfer-account" value={transferAccountId} onChange={(e) => setTransferAccountId(e.target.value)} required>
                <option value="" disabled>
                  Selecione
                </option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {relevantCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {type !== "transfer" && (
          <div>
            <Label htmlFor="responsible">Responsável</Label>
            <Select id="responsible" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
              <option value="">Compartilhado</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          Já foi pago/recebido
        </label>

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
