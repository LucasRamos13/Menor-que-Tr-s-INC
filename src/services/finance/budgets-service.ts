import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { BudgetInput } from "@/validation/finance";
import { calculateBudgetProgress, sumByCategory, type BudgetProgress } from "./budgets";

type TypedClient = SupabaseClient<Database>;

export async function listBudgets(supabase: TypedClient, coupleId: string, year: number, month: number): Promise<Tables<"budgets">[]> {
  const { data, error } = await supabase.from("budgets").select("*").eq("couple_id", coupleId).eq("year", year).eq("month", month);
  if (error) throw error;
  return data;
}

export async function upsertBudget(supabase: TypedClient, coupleId: string, input: BudgetInput): Promise<Tables<"budgets">> {
  const { data, error } = await supabase
    .from("budgets")
    .upsert({ ...input, couple_id: coupleId }, { onConflict: "couple_id,category_id,year,month" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudget(supabase: TypedClient, budgetId: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) throw error;
}

export async function getBudgetProgressForMonth(supabase: TypedClient, coupleId: string, year: number, month: number): Promise<BudgetProgress[]> {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [budgets, { data: transactions, error }] = await Promise.all([
    listBudgets(supabase, coupleId, year, month),
    supabase.from("transactions").select("category_id, amount_cents, type").eq("couple_id", coupleId).gte("date", monthStart).lt("date", nextMonth),
  ]);
  if (error) throw error;

  const totals = sumByCategory(transactions ?? []);
  return budgets.map((b) => calculateBudgetProgress(b.limit_cents, totals.get(b.category_id) ?? 0, b.category_id));
}
