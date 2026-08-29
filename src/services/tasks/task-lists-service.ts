import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { TaskListInput } from "@/validation/tasks";

type TypedClient = SupabaseClient<Database>;

export async function listTaskLists(supabase: TypedClient, coupleId: string): Promise<Tables<"task_lists">[]> {
  const { data, error } = await supabase.from("task_lists").select("*").eq("couple_id", coupleId).order("position").order("name");
  if (error) throw error;
  return data;
}

export async function createTaskList(supabase: TypedClient, coupleId: string, input: TaskListInput): Promise<Tables<"task_lists">> {
  const { data, error } = await supabase
    .from("task_lists")
    .insert({ ...input, couple_id: coupleId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskList(supabase: TypedClient, listId: string, input: Partial<TaskListInput>): Promise<Tables<"task_lists">> {
  const { data, error } = await supabase.from("task_lists").update(input).eq("id", listId).select().single();
  if (error) throw error;
  return data;
}

export async function reorderTaskLists(supabase: TypedClient, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, index) => supabase.from("task_lists").update({ position: index }).eq("id", id)));
}

export async function deleteTaskList(supabase: TypedClient, listId: string): Promise<void> {
  const { error } = await supabase.from("task_lists").delete().eq("id", listId);
  if (error) throw error;
}
