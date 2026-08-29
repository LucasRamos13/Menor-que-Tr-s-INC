import { describe, expect, it } from "vitest";
import { buildInstallmentPlan } from "@/services/finance/installments";

describe("buildInstallmentPlan", () => {
  it("splits an amount evenly across installments", () => {
    const plan = buildInstallmentPlan(120000, 12, "2026-01-15");
    expect(plan).toHaveLength(12);
    expect(plan.every((p) => p.amountCents === 10000)).toBe(true);
    expect(plan[0].dueDate).toBe("2026-01-15");
    expect(plan[11].dueDate).toBe("2026-12-15");
  });

  it("distributes rounding remainder to the first installments without losing or inventing cents", () => {
    const plan = buildInstallmentPlan(1000, 3, "2026-01-01"); // 1000 / 3 = 333.33...
    const total = plan.reduce((sum, p) => sum + p.amountCents, 0);
    expect(total).toBe(1000);
    expect(plan.map((p) => p.amountCents)).toEqual([334, 333, 333]);
  });

  it("rolls due dates across year boundaries", () => {
    const plan = buildInstallmentPlan(300, 3, "2026-11-30");
    expect(plan.map((p) => p.dueDate)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
  });
});
