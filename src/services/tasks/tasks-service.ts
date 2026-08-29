import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TaskStatus } from "@/types/database";
import type { TaskInput } from "@/validation/tasks";
import { todayISODate } from "@/lib/dates";

type TypedClient = SupabaseClient<Database>;

export interface TaskFilters {
  listId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  search?: string;
  dueBefore?: string;
}

export async function listTasks(supabase: TypedClient, coupleId: string, filters: TaskFilters = {}): Promise<Tables<"tasks">[]> {
  let query = supabase.from("tasks").select("*").eq("couple_id", coupleId);
  if (filters.listId) query = query.eq("list_id", filters.listId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters.dueBefore) query = query.lte("due_date", filters.dueBefore);

  const { data, error } = await query.order("position").order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export interface TaskDashboard {
  dueToday: Tables<"tasks">[];
  overdue: Tables<"tasks">[];
  upcoming: Tables<"tasks">[];
}

/** Powers the "Hoje / Atrasadas" widgets on the tasks page and main dashboard. */
export async function getTaskDashboard(supabase: TypedClient, coupleId: string): Promise<TaskDashboard> {
  const today = todayISODate();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("couple_id", coupleId)
    .neq("status", "done")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });
  if (error) throw error;

  const dueToday = data.filter((t) => t.due_date === today);
  const overdue = data.filter((t) => t.due_date! < today);
  const upcoming = data.filter((t) => t.due_date! > today).slice(0, 5);

  return { dueToday, overdue, upcoming };
}

export async function createTask(supabase: TypedClient, coupleId: string, userId: string, input: TaskInput): Promise<Tables<"tasks">> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(supabase: TypedClient, taskId: string, input: Partial<TaskInput>): Promise<Tables<"tasks">> {
  const { data, error } = await supabase.from("tasks").update(input).eq("id", taskId).select().single();
  if (error) throw error;
  return data;
}

export async function setTaskStatus(supabase: TypedClient, taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw error;
}

export async function toggleTaskDone(supabase: TypedClient, taskId: string, done: boolean): Promise<void> {
  await setTaskStatus(supabase, taskId, done ? "done" : "todo");
}

export async function reorderTasks(supabase: TypedClient, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, index) => supabase.from("tasks").update({ position: index }).eq("id", id)));
}

export async function deleteTask(supabase: TypedClient, taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}
