import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { RecurringTransactionInput } from "@/validation/finance";
import { occurrencesBetween } from "./recurrence";
import { todayISODate } from "@/lib/dates";

type TypedClient = SupabaseClient<Database>;

export async function listRecurringTransactions(supabase: TypedClient, coupleId: string): Promise<Tables<"recurring_transactions">[]> {
  const { data, error } = await supabase.from("recurring_transactions").select("*").eq("couple_id", coupleId).order("description");
  if (error) throw error;
  return data;
}

export async function createRecurringTransaction(supabase: TypedClient, coupleId: string, userId: string, input: RecurringTransactionInput): Promise<Tables<"recurring_transactions">> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecurringTransaction(supabase: TypedClient, id: string, input: Partial<RecurringTransactionInput>): Promise<Tables<"recurring_transactions">> {
  const { data, error } = await supabase.from("recurring_transactions").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deactivateRecurringTransaction(supabase: TypedClient, id: string): Promise<void> {
  const { error } = await supabase.from("recurring_transactions").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export async function deleteRecurringTransaction(supabase: TypedClient, id: string): Promise<void> {
  const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Materializes due transactions for every active recurring rule in the
 * couple, up to (and including) today. Cheap to call on every dashboard/
 * transactions page load: it's a no-op once a rule is caught up, since
 * `last_generated_date` is advanced after each run. This is what stands in
 * for a cron job without needing one.
 */
export async function generateDueRecurringTransactions(supabase: TypedClient, coupleId: string, userId: string): Promise<number> {
  const { data: rules, error } = await supabase.from("recurring_transactions").select("*").eq("couple_id", coupleId).eq("is_active", true);
  if (error) throw error;

  const today = todayISODate();
  let created = 0;

  for (const rule of rules) {
    const dates = occurrencesBetween(
      {
        frequency: rule.frequency,
        intervalCount: rule.interval_count,
        dayOfMonth: rule.day_of_month,
        startDate: rule.start_date,
        endDate: rule.end_date,
      },
      today,
      rule.last_generated_date,
    );

    if (dates.length === 0) continue;

    const rows = dates.map((date) => ({
      couple_id: coupleId,
      account_id: rule.account_id,
      type: rule.type,
      amount_cents: rule.amount_cents,
      description: rule.description,
      category_id: rule.category_id,
      responsible_id: rule.responsible_id,
      date,
      is_paid: true,
      recurring_transaction_id: rule.id,
      created_by: userId,
    }));

    const { error: insertError } = await supabase.from("transactions").insert(rows);
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("recurring_transactions")
      .update({ last_generated_date: dates[dates.length - 1] })
      .eq("id", rule.id);
    if (updateError) throw updateError;

    created += dates.length;
  }

  return created;
}
