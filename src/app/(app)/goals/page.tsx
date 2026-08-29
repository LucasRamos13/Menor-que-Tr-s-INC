import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listGoals } from "@/services/finance/goals-service";
import { GoalsBoard } from "./goals-board";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const goals = await listGoals(supabase, couple.coupleId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Objetivos</h1>
      <GoalsBoard coupleId={couple.coupleId} userId={user!.id} goals={goals} members={couple.members} />
    </div>
  );
}
