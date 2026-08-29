export interface TransactionLike {
  type: "income" | "expense" | "transfer";
  amount_cents: number;
  account_id: string;
  transfer_account_id?: string | null;
  category_id?: string | null;
  date: string;
}

export interface AccountLike {
  id: string;
  initial_balance_cents: number;
  is_active: boolean;
}

/** Current balance of a single account: initial balance + signed transactions that touch it. */
export function accountBalance(account: AccountLike, transactions: TransactionLike[]): number {
  let balance = account.initial_balance_cents;
  for (const t of transactions) {
    if (t.type === "income" && t.account_id === account.id) balance += t.amount_cents;
    else if (t.type === "expense" && t.account_id === account.id) balance -= t.amount_cents;
    else if (t.type === "transfer") {
      if (t.account_id === account.id) balance -= t.amount_cents;
      if (t.transfer_account_id === account.id) balance += t.amount_cents;
    }
  }
  return balance;
}

export function totalBalance(accounts: AccountLike[], transactions: TransactionLike[]): number {
  return accounts.filter((a) => a.is_active).reduce((sum, a) => sum + accountBalance(a, transactions), 0);
}

export interface MonthSummary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export function summarizeMonth(transactions: TransactionLike[]): MonthSummary {
  const incomeCents = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount_cents, 0);
  const expenseCents = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount_cents, 0);
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

export interface CategoryTotal {
  categoryId: string;
  totalCents: number;
}

export function topExpenseCategories(transactions: TransactionLike[], limit = 5): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount_cents);
  }
  return [...totals.entries()]
    .map(([categoryId, totalCents]) => ({ categoryId, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit);
}

export function monthOverMonthChange(current: MonthSummary, previous: MonthSummary): { incomeDeltaPct: number | null; expenseDeltaPct: number | null } {
  const pct = (curr: number, prev: number) => (prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10);
  return {
    incomeDeltaPct: pct(current.incomeCents, previous.incomeCents),
    expenseDeltaPct: pct(current.expenseCents, previous.expenseCents),
  };
}
