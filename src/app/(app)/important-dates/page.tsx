import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listImportantDates } from "@/services/calendar/important-dates-service";
import { ImportantDatesBoard } from "./important-dates-board";

export default async function ImportantDatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const dates = await listImportantDates(supabase, couple.coupleId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Datas importantes</h1>
      <ImportantDatesBoard coupleId={couple.coupleId} userId={user!.id} dates={dates} />
    </div>
  );
}
