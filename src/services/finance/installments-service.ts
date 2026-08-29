import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { InstallmentInput } from "@/validation/finance";
import { buildInstallmentPlan } from "./installments";

type TypedClient = SupabaseClient<Database>;

export async function listInstallmentPlans(supabase: TypedClient, coupleId: string): Promise<Tables<"installments">[]> {
  const { data, error } = await supabase.from("installments").select("*").eq("couple_id", coupleId).order("first_due_date", { ascending: false });
  if (error) throw error;
  return data;
}

/** Creates the installment plan row and immediately materializes every future installment as a transaction. */
export async function createInstallmentPlan(supabase: TypedClient, coupleId: string, userId: string, input: InstallmentInput): Promise<Tables<"installments">> {
  const { data: plan, error } = await supabase
    .from("installments")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const entries = buildInstallmentPlan(input.total_amount_cents, input.installment_count, input.first_due_date);
  const rows = entries.map((entry) => ({
    couple_id: coupleId,
    account_id: input.account_id,
    type: "expense" as const,
    amount_cents: entry.amountCents,
    description: `${input.description} (${entry.number}/${input.installment_count})`,
    category_id: input.category_id,
    responsible_id: input.responsible_id,
    date: entry.dueDate,
    is_paid: false,
    installment_id: plan.id,
    installment_number: entry.number,
    installment_total: input.installment_count,
    created_by: userId,
  }));

  const { error: insertError } = await supabase.from("transactions").insert(rows);
  if (insertError) throw insertError;

  return plan;
}

export async function deleteInstallmentPlan(supabase: TypedClient, planId: string): Promise<void> {
  // Unpaid future installments are removed along with the plan; paid ones are
  // detached (installment_id set null via ON DELETE SET NULL) so history stays intact.
  const { error } = await supabase.from("transactions").delete().eq("installment_id", planId).eq("is_paid", false);
  if (error) throw error;
  const { error: planError } = await supabase.from("installments").delete().eq("id", planId);
  if (planError) throw planError;
}
