import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { CategoryInput } from "@/validation/finance";

type TypedClient = SupabaseClient<Database>;

export async function listCategories(supabase: TypedClient, coupleId: string): Promise<Tables<"categories">[]> {
  const { data, error } = await supabase.from("categories").select("*").eq("couple_id", coupleId).order("name");
  if (error) throw error;
  return data;
}

export async function createCategory(supabase: TypedClient, coupleId: string, input: CategoryInput): Promise<Tables<"categories">> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...input, couple_id: coupleId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(supabase: TypedClient, categoryId: string, input: Partial<CategoryInput>): Promise<Tables<"categories">> {
  const { data, error } = await supabase.from("categories").update(input).eq("id", categoryId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(supabase: TypedClient, categoryId: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
}
