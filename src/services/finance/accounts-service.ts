import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { AccountInput } from "@/validation/finance";

type TypedClient = SupabaseClient<Database>;

export async function listAccounts(supabase: TypedClient, coupleId: string): Promise<Tables<"accounts">[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("couple_id", coupleId)
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;
  return data;
}

export async function createAccount(supabase: TypedClient, coupleId: string, userId: string, input: AccountInput): Promise<Tables<"accounts">> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(supabase: TypedClient, accountId: string, userId: string, input: Partial<AccountInput>): Promise<Tables<"accounts">> {
  const { data, error } = await supabase
    .from("accounts")
    .update({ ...input, updated_by: userId })
    .eq("id", accountId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveAccount(supabase: TypedClient, accountId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("accounts").update({ is_active: false, updated_by: userId }).eq("id", accountId);
  if (error) throw error;
}

export async function deleteAccount(supabase: TypedClient, accountId: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw error;
}
