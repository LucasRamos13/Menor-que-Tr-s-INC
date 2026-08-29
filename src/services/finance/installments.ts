export interface InstallmentPlanEntry {
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
}

/**
 * Splits a total amount into N monthly installments. Integer division of
 * cents never divides evenly, so the remainder (a few cents) is distributed
 * one-by-one to the first installments — the classic way invoices avoid
 * losing or inventing money to rounding.
 */
export function buildInstallmentPlan(totalAmountCents: number, installmentCount: number, firstDueDate: string): InstallmentPlanEntry[] {
  const base = Math.floor(totalAmountCents / installmentCount);
  const remainder = totalAmountCents - base * installmentCount;

  const [y, m, d] = firstDueDate.slice(0, 10).split("-").map(Number);

  return Array.from({ length: installmentCount }, (_, i) => {
    const amountCents = base + (i < remainder ? 1 : 0);
    const dueDate = new Date(Date.UTC(y, m - 1 + i, d));
    return {
      number: i + 1,
      dueDate: dueDate.toISOString().slice(0, 10),
      amountCents,
    };
  });
}

export function installmentLabel(number: number, total: number): string {
  return `Parcela ${number}/${total}`;
}
