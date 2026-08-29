import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listCategories } from "@/services/finance/categories-service";
import { listBudgets, getBudgetProgressForMonth } from "@/services/finance/budgets-service";
import { BudgetsManager } from "./budgets-manager";
import { todayISODate } from "@/lib/dates";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const today = todayISODate();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  const [categories, budgets, progress] = await Promise.all([
    listCategories(supabase, couple.coupleId),
    listBudgets(supabase, couple.coupleId, year, month),
    getBudgetProgressForMonth(supabase, couple.coupleId, year, month),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Orçamento do mês</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Defina limites por categoria e acompanhe o progresso em tempo real.</p>
      </div>
      <BudgetsManager coupleId={couple.coupleId} year={year} month={month} categories={categories} budgets={budgets} progress={progress} />
    </div>
  );
}
