import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listAccounts } from "@/services/finance/accounts-service";
import { listCategories } from "@/services/finance/categories-service";
import { listTransactions } from "@/services/finance/transactions-service";
import { TransactionsExplorer } from "./transactions-explorer";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const [accounts, categories, initialPage] = await Promise.all([
    listAccounts(supabase, couple.coupleId),
    listCategories(supabase, couple.coupleId),
    listTransactions(supabase, couple.coupleId, { pageSize: 30 }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Transações</h1>
      <TransactionsExplorer
        coupleId={couple.coupleId}
        userId={user!.id}
        accounts={accounts}
        categories={categories}
        members={couple.members}
        initialTransactions={initialPage.transactions}
        initialTotal={initialPage.total}
      />
    </div>
  );
}
