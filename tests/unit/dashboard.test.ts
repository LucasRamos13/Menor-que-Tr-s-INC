import { describe, expect, it } from "vitest";
import { accountBalance, summarizeMonth, topExpenseCategories, totalBalance, monthOverMonthChange } from "@/services/finance/dashboard";

const checking = { id: "acc-1", initial_balance_cents: 100000, is_active: true };
const wallet = { id: "acc-2", initial_balance_cents: 5000, is_active: true };

describe("accountBalance", () => {
  it("applies income and expenses to the right account", () => {
    const transactions = [
      { type: "income" as const, amount_cents: 20000, account_id: "acc-1", date: "2026-01-01" },
      { type: "expense" as const, amount_cents: 5000, account_id: "acc-1", date: "2026-01-02" },
    ];
    expect(accountBalance(checking, transactions)).toBe(115000);
  });

  it("moves money between accounts on a transfer", () => {
    const transactions = [{ type: "transfer" as const, amount_cents: 3000, account_id: "acc-1", transfer_account_id: "acc-2", date: "2026-01-01" }];
    expect(accountBalance(checking, transactions)).toBe(97000);
    expect(accountBalance(wallet, transactions)).toBe(8000);
  });
});

describe("totalBalance", () => {
  it("only counts active accounts", () => {
    const inactive = { id: "acc-3", initial_balance_cents: 999999, is_active: false };
    expect(totalBalance([checking, wallet, inactive], [])).toBe(105000);
  });
});

describe("summarizeMonth", () => {
  it("computes income, expense and net", () => {
    const summary = summarizeMonth([
      { type: "income", amount_cents: 500000, account_id: "acc-1", date: "2026-01-05" },
      { type: "expense", amount_cents: 120000, account_id: "acc-1", date: "2026-01-10" },
      { type: "transfer", amount_cents: 10000, account_id: "acc-1", date: "2026-01-12" },
    ]);
    expect(summary).toEqual({ incomeCents: 500000, expenseCents: 120000, netCents: 380000 });
  });
});

describe("topExpenseCategories", () => {
  it("ranks categories by total spent, descending", () => {
    const top = topExpenseCategories([
      { type: "expense", amount_cents: 30000, account_id: "a", category_id: "food", date: "2026-01-01" },
      { type: "expense", amount_cents: 80000, account_id: "a", category_id: "housing", date: "2026-01-01" },
      { type: "expense", amount_cents: 10000, account_id: "a", category_id: "food", date: "2026-01-02" },
    ]);
    expect(top[0]).toEqual({ categoryId: "housing", totalCents: 80000 });
    expect(top[1]).toEqual({ categoryId: "food", totalCents: 40000 });
  });
});

describe("monthOverMonthChange", () => {
  it("computes percentage deltas, null when there is no baseline", () => {
    const current = { incomeCents: 550000, expenseCents: 100000, netCents: 450000 };
    const previous = { incomeCents: 500000, expenseCents: 0, netCents: 500000 };
    const change = monthOverMonthChange(current, previous);
    expect(change.incomeDeltaPct).toBe(10);
    expect(change.expenseDeltaPct).toBeNull();
  });
});
