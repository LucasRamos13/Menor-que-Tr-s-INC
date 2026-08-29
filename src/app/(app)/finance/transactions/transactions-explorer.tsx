"use client";

import { useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RecentTransactionsList } from "../recent-transactions-list";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { listTransactions, type TransactionFilters } from "@/services/finance/transactions-service";
import type { Tables, TransactionType } from "@/types/database";

interface TransactionsExplorerProps {
  coupleId: string;
  userId: string;
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  members: { id: string; fullName: string | null }[];
  initialTransactions: Tables<"transactions">[];
  initialTotal: number;
}

const PAGE_SIZE = 30;

export function TransactionsExplorer({ coupleId, userId, accounts, categories, members, initialTransactions, initialTotal }: TransactionsExplorerProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refetch(overrides: Partial<TransactionFilters> & { page?: number } = {}) {
    const nextPage = overrides.page ?? 0;
    startTransition(async () => {
      const supabase = createClient();
      const result = await listTransactions(supabase, coupleId, {
        search: overrides.search ?? search,
        type: (overrides.type ?? type) || undefined,
        accountId: overrides.accountId ?? accountId,
        categoryId: overrides.categoryId ?? categoryId,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setTransactions(result.transactions);
      setTotal(result.total);
      setPage(nextPage);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refetch()}
          />
        </div>
        <Select className="w-40" value={type} onChange={(e) => { setType(e.target.value as TransactionType | ""); refetch({ type: (e.target.value as TransactionType) || undefined }); }}>
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
          <option value="transfer">Transferências</option>
        </Select>
        <Select className="w-40" value={accountId} onChange={(e) => { setAccountId(e.target.value); refetch({ accountId: e.target.value }); }}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select className="w-44" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); refetch({ categoryId: e.target.value }); }}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      <div className={isPending ? "opacity-60" : ""}>
        <RecentTransactionsList coupleId={coupleId} userId={userId} transactions={transactions} accounts={accounts} categories={categories} members={members} onChanged={() => refetch({ page })} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => refetch({ page: page - 1 })}>
            Anterior
          </Button>
          <span className="text-slate-500">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => refetch({ page: page + 1 })}>
            Próxima
          </Button>
        </div>
      )}

      <TransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        coupleId={coupleId}
        userId={userId}
        accounts={accounts}
        categories={categories}
        members={members}
        onSaved={() => refetch({ page })}
      />
    </div>
  );
}
