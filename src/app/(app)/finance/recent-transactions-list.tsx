"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Pencil, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteTransaction, duplicateTransaction } from "@/services/finance/transactions-service";
import { logAndFormat } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { Tables } from "@/types/database";

interface RecentTransactionsListProps {
  coupleId: string;
  userId: string;
  transactions: Tables<"transactions">[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  members?: { id: string; fullName: string | null }[];
  /** Called after any mutation so the caller can refresh its own data source. Defaults to a full router refresh. */
  onChanged?: () => void;
}

export function RecentTransactionsList({ coupleId, userId, transactions, accounts, categories, members = [], onChanged }: RecentTransactionsListProps) {
  const [editing, setEditing] = useState<Tables<"transactions"> | null>(null);
  const [deleting, setDeleting] = useState<Tables<"transactions"> | null>(null);
  const router = useRouter();
  const notifyChanged = onChanged ?? (() => router.refresh());

  async function handleDuplicate(t: Tables<"transactions">) {
    try {
      const supabase = createClient();
      await duplicateTransaction(supabase, coupleId, userId, t);
      toast.success("✓ Transação duplicada");
      notifyChanged();
    } catch (error) {
      toast.error(logAndFormat(error, "duplicate-transaction"));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const supabase = createClient();
      await deleteTransaction(supabase, deleting.id);
      toast.success("Transação excluída");
      notifyChanged();
    } catch (error) {
      toast.error(logAndFormat(error, "delete-transaction"));
    }
  }

  if (transactions.length === 0) {
    return <EmptyState icon={Receipt} title="Nenhuma transação ainda" description="Adicione sua primeira receita ou despesa." />;
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {transactions.map((t) => {
        const category = t.category_id ? categoryById.get(t.category_id) : null;
        const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
        const color = t.type === "income" ? "text-emerald-600" : t.type === "expense" ? "text-red-600" : "text-slate-500";
        return (
          <div key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.description}</p>
              <p className="text-xs text-slate-400">
                {category ? `${category.icon ?? ""} ${category.name} · ` : ""}
                {formatDate(t.date)}
                {!t.is_paid && " · pendente"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className={`shrink-0 text-sm font-semibold ${color}`}>
                {sign} {centsToBRL(t.amount_cents)}
              </span>
              <Button variant="ghost" size="icon" onClick={() => handleDuplicate(t)} aria-label="Duplicar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(t)} aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <TransactionFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        coupleId={coupleId}
        userId={userId}
        accounts={accounts}
        categories={categories}
        members={members}
        transaction={editing}
        onSaved={notifyChanged}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir transação?"
        description="Esta transação será excluída permanentemente."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </div>
  );
}
