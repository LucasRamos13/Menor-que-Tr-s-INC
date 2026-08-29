import { describe, expect, it } from "vitest";
import { calculateBudgetProgress, sumByCategory } from "@/services/finance/budgets";

describe("calculateBudgetProgress", () => {
  it("reports ok status below the warning threshold", () => {
    const progress = calculateBudgetProgress(80000, 30000, "cat-1");
    expect(progress.status).toBe("ok");
    expect(progress.percentage).toBeCloseTo(37.5, 1);
  });

  it("reports warning status past 80%", () => {
    const progress = calculateBudgetProgress(80000, 65000, "cat-1");
    expect(progress.status).toBe("warning");
  });

  it("reports over status at or beyond the limit, without capping the percentage", () => {
    const progress = calculateBudgetProgress(80000, 96000, "cat-1");
    expect(progress.status).toBe("over");
    expect(progress.percentage).toBe(120);
  });

  it("treats a zero limit as 0% instead of dividing by zero", () => {
    const progress = calculateBudgetProgress(0, 5000, "cat-1");
    expect(progress.percentage).toBe(0);
  });
});

describe("sumByCategory", () => {
  it("sums only expense transactions, grouped by category", () => {
    const totals = sumByCategory([
      { category_id: "food", amount_cents: 5000, type: "expense" },
      { category_id: "food", amount_cents: 3000, type: "expense" },
      { category_id: "leisure", amount_cents: 2000, type: "expense" },
      { category_id: "salary", amount_cents: 500000, type: "income" },
      { category_id: null, amount_cents: 1000, type: "expense" },
    ]);
    expect(totals.get("food")).toBe(8000);
    expect(totals.get("leisure")).toBe(2000);
    expect(totals.has("salary")).toBe(false);
  });
});
