/**
 * All money in this app is stored and computed as integer cents (bigint in
 * Postgres, number here — safe up to ~9*10^15 cents, far beyond any personal
 * finance use case). Never do arithmetic on floating point reais.
 */

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function centsToBRL(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/** Formats without the currency symbol, e.g. "1.234,56". */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses user-typed Brazilian currency input ("1.234,56", "1234,56", "50",
 * "R$ 50,00") into integer cents. Returns null when the input isn't a
 * parseable number.
 */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // drop thousands separators
    .replace(",", ".");

  if (cleaned === "" || Number.isNaN(Number(cleaned))) return null;

  const value = Number(cleaned);
  return Math.round(value * 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function percentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 1000) / 10);
}
