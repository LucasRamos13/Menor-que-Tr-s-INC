import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { FinancialGoalInput, GoalContributionInput } from "@/validation/finance";

type TypedClient = SupabaseClient<Database>;

export async function listGoals(supabase: TypedClient, coupleId: string): Promise<Tables<"financial_goals">[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("couple_id", coupleId)
    .order("is_completed")
    .order("target_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createGoal(supabase: TypedClient, coupleId: string, userId: string, input: FinancialGoalInput): Promise<Tables<"financial_goals">> {
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(supabase: TypedClient, goalId: string, input: Partial<FinancialGoalInput>): Promise<Tables<"financial_goals">> {
  const { data, error } = await supabase.from("financial_goals").update(input).eq("id", goalId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(supabase: TypedClient, goalId: string): Promise<void> {
  const { error } = await supabase.from("financial_goals").delete().eq("id", goalId);
  if (error) throw error;
}

export async function listContributions(supabase: TypedClient, goalId: string): Promise<Tables<"goal_contributions">[]> {
  const { data, error } = await supabase.from("goal_contributions").select("*").eq("goal_id", goalId).order("date", { ascending: false });
  if (error) throw error;
  return data;
}

/** The current_amount_cents / is_completed columns update themselves via a DB trigger — see migration 0003. */
export async function addContribution(supabase: TypedClient, userId: string, input: GoalContributionInput): Promise<Tables<"goal_contributions">> {
  const { data, error } = await supabase
    .from("goal_contributions")
    .insert({ ...input, contributed_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeContribution(supabase: TypedClient, contributionId: string): Promise<void> {
  const { error } = await supabase.from("goal_contributions").delete().eq("id", contributionId);
  if (error) throw error;
}
