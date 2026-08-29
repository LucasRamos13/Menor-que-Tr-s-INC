export interface BudgetProgress {
  categoryId: string;
  limitCents: number;
  spentCents: number;
  percentage: number; // 0-100+, uncapped so the UI can show overspend
  status: "ok" | "warning" | "over";
}

const WARNING_THRESHOLD = 80;

export function calculateBudgetProgress(limitCents: number, spentCents: number, categoryId: string): BudgetProgress {
  const percentage = limitCents > 0 ? Math.round((spentCents / limitCents) * 1000) / 10 : 0;
  const status: BudgetProgress["status"] = percentage >= 100 ? "over" : percentage >= WARNING_THRESHOLD ? "warning" : "ok";

  return { categoryId, limitCents, spentCents, percentage, status };
}

/** Sums expense transaction amounts (cents) per category_id for a given list. */
export function sumByCategory(transactions: { category_id: string | null; amount_cents: number; type: string }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount_cents);
  }
  return totals;
}
