import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import type { ImportantDateInput } from "@/validation/calendar";
import { daysUntil, nextYearlyOccurrence, toISODateString } from "@/lib/dates";

type TypedClient = SupabaseClient<Database>;

export interface ImportantDateWithCountdown extends Tables<"important_dates"> {
  nextOccurrenceISO: string;
  daysRemaining: number;
}

export async function listImportantDates(supabase: TypedClient, coupleId: string): Promise<ImportantDateWithCountdown[]> {
  const { data, error } = await supabase.from("important_dates").select("*").eq("couple_id", coupleId);
  if (error) throw error;

  return data
    .map((row) => {
      const nextOccurrence = row.is_recurring_yearly ? nextYearlyOccurrence(row.date) : new Date(`${row.date}T00:00:00`);
      const nextOccurrenceISO = toISODateString(nextOccurrence);
      return { ...row, nextOccurrenceISO, daysRemaining: daysUntil(nextOccurrenceISO) };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function createImportantDate(supabase: TypedClient, coupleId: string, userId: string, input: ImportantDateInput): Promise<Tables<"important_dates">> {
  const { data, error } = await supabase
    .from("important_dates")
    .insert({ ...input, couple_id: coupleId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateImportantDate(supabase: TypedClient, id: string, input: Partial<ImportantDateInput>): Promise<Tables<"important_dates">> {
  const { data, error } = await supabase.from("important_dates").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteImportantDate(supabase: TypedClient, id: string): Promise<void> {
  const { error } = await supabase.from("important_dates").delete().eq("id", id);
  if (error) throw error;
}
