import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listAccounts } from "@/services/finance/accounts-service";
import { listCategories } from "@/services/finance/categories-service";
import { listRecurringTransactions } from "@/services/finance/recurring-service";
import { RecurringManager } from "./recurring-manager";

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const [accounts, categories, recurring] = await Promise.all([
    listAccounts(supabase, couple.coupleId),
    listCategories(supabase, couple.coupleId),
    listRecurringTransactions(supabase, couple.coupleId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Recorrências</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Receitas e despesas que se repetem automaticamente, como aluguel e salário.</p>
      </div>
      <RecurringManager coupleId={couple.coupleId} userId={user!.id} accounts={accounts} categories={categories} recurring={recurring} members={couple.members} />
    </div>
  );
}
