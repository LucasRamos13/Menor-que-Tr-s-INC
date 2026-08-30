import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TransactionType } from "@/types/database";
import type { TransactionInput } from "@/validation/finance";

type TypedClient = SupabaseClient<Database>;

export interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionPage {
  transactions: Tables<"transactions">[];
  total: number;
}

/**
 * Total balance across active accounts, computed in Postgres instead of
 * fetching every transaction row into the app — see 0008_finance_summary_aggregates.sql.
 */
export async function getCoupleBalance(supabase: TypedClient, coupleId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_couple_balance", { p_couple_id: coupleId });
  if (error) throw error;
  return data ?? 0;
}

export async function getCoupleMonthSummary(supabase: TypedClient, coupleId: string, monthStartISO: string): Promise<{ incomeCents: number; expenseCents: number }> {
  const { data, error } = await supabase.rpc("get_couple_month_summary", { p_couple_id: coupleId, p_month_start: monthStartISO }).single();
  if (error) throw error;
  return { incomeCents: data.income_cents, expenseCents: data.expense_cents };
}

export async function listTransactions(supabase: TypedClient, coupleId: string, filters: TransactionFilters = {}): Promise<TransactionPage> {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;

  let query = supabase.from("transactions").select("*", { count: "exact" }).eq("couple_id", coupleId);

  if (filters.fromDate) query = query.gte("date", filters.fromDate);
  if (filters.toDate) query = query.lte("date", filters.toDate);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.search) query = query.ilike("description", `%${filters.search}%`);

  query = query.order("date", { ascending: false }).order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { transactions: data, total: count ?? 0 };
}

export async function getRecentTransactions(supabase: TypedClient, coupleId: string, limit = 8): Promise<Tables<"transactions">[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createTransaction(supabase: TypedClient, coupleId: string, userId: string, input: TransactionInput): Promise<Tables<"transactions">> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(supabase: TypedClient, transactionId: string, userId: string, input: Partial<TransactionInput>): Promise<Tables<"transactions">> {
  const { data, error } = await supabase
    .from("transactions")
    .update({ ...input, updated_by: userId })
    .eq("id", transactionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(supabase: TypedClient, transactionId: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) throw error;
}

export async function togglePaid(supabase: TypedClient, transactionId: string, isPaid: boolean): Promise<void> {
  const { error } = await supabase.from("transactions").update({ is_paid: isPaid }).eq("id", transactionId);
  if (error) throw error;
}

/** Quality-of-life: clone an existing transaction (usually with today's date) so repeat entries take one tap. */
export async function duplicateTransaction(supabase: TypedClient, coupleId: string, userId: string, source: Tables<"transactions">, overrides: Partial<TransactionInput> = {}): Promise<Tables<"transactions">> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      couple_id: coupleId,
      created_by: userId,
      account_id: source.account_id,
      transfer_account_id: source.transfer_account_id,
      type: source.type,
      amount_cents: source.amount_cents,
      description: source.description,
      category_id: source.category_id,
      responsible_id: source.responsible_id,
      date: new Date().toISOString().slice(0, 10),
      is_paid: true,
      notes: source.notes,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
