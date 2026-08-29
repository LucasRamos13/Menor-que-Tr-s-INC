import { z } from "zod";

export const accountTypeSchema = z.enum(["checking", "savings", "wallet", "credit_card", "investment", "other"]);
export const visibilitySchema = z.enum(["shared", "personal"]);
export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export const categoryKindSchema = z.enum(["income", "expense", "both"]);
export const recurrenceFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para a conta").max(80),
  type: accountTypeSchema,
  institution: z.string().trim().max(80).optional().nullable(),
  initial_balance_cents: z.number().int(),
  is_active: z.boolean().default(true),
  visibility: visibilitySchema,
  owner_id: z.string().uuid().optional().nullable(),
}).refine((data) => (data.visibility === "personal" ? !!data.owner_id : true), {
  message: "Selecione a pessoa dona da conta pessoal",
  path: ["owner_id"],
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para a categoria").max(60),
  icon: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  kind: categoryKindSchema,
});

export const transactionSchema = z
  .object({
    account_id: z.string().uuid("Selecione uma conta"),
    transfer_account_id: z.string().uuid().optional().nullable(),
    type: transactionTypeSchema,
    amount_cents: z.number().int().positive("Informe um valor maior que zero"),
    description: z.string().trim().min(1, "Informe uma descrição").max(140),
    category_id: z.string().uuid().optional().nullable(),
    responsible_id: z.string().uuid().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    is_paid: z.boolean().default(true),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => (data.type === "transfer" ? !!data.transfer_account_id : true), {
    message: "Selecione a conta de destino da transferência",
    path: ["transfer_account_id"],
  })
  .refine((data) => data.transfer_account_id !== data.account_id, {
    message: "A conta de origem e destino devem ser diferentes",
    path: ["transfer_account_id"],
  });

export const recurringTransactionSchema = z.object({
  account_id: z.string().uuid("Selecione uma conta"),
  type: z.enum(["income", "expense"]),
  amount_cents: z.number().int().positive("Informe um valor maior que zero"),
  description: z.string().trim().min(1).max(140),
  category_id: z.string().uuid().optional().nullable(),
  responsible_id: z.string().uuid().optional().nullable(),
  frequency: recurrenceFrequencySchema,
  interval_count: z.number().int().positive().default(1),
  day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const installmentSchema = z.object({
  account_id: z.string().uuid("Selecione uma conta"),
  description: z.string().trim().min(1).max(140),
  total_amount_cents: z.number().int().positive("Informe um valor maior que zero"),
  installment_count: z.number().int().min(2, "Parcelamento precisa de ao menos 2 parcelas").max(120),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().optional().nullable(),
  responsible_id: z.string().uuid().optional().nullable(),
});

export const budgetSchema = z.object({
  category_id: z.string().uuid("Selecione uma categoria"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  limit_cents: z.number().int().positive("Informe um limite maior que zero"),
});

export const financialGoalSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(8).optional().nullable(),
  target_amount_cents: z.number().int().positive("Informe uma meta maior que zero"),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  visibility: visibilitySchema,
  owner_id: z.string().uuid().optional().nullable(),
}).refine((data) => (data.visibility === "personal" ? !!data.owner_id : true), {
  message: "Selecione a pessoa dona do objetivo pessoal",
  path: ["owner_id"],
});

export const goalContributionSchema = z.object({
  goal_id: z.string().uuid(),
  amount_cents: z.number().int().refine((v) => v !== 0, "Informe um valor diferente de zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(280).optional().nullable(),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
export type InstallmentInput = z.infer<typeof installmentSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type FinancialGoalInput = z.infer<typeof financialGoalSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
