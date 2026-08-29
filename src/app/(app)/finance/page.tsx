import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listAccounts } from "@/services/finance/accounts-service";
import { listTransactions, getRecentTransactions } from "@/services/finance/transactions-service";
import { listCategories } from "@/services/finance/categories-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsManager } from "./accounts-manager";
import { RecentTransactionsList } from "./recent-transactions-list";
import { QuickAddTransaction } from "./quick-add-transaction";

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const [accounts, allTx, recent, categories] = await Promise.all([
    listAccounts(supabase, couple.coupleId),
    listTransactions(supabase, couple.coupleId, { pageSize: 1000 }),
    getRecentTransactions(supabase, couple.coupleId, 8),
    listCategories(supabase, couple.coupleId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Finanças</h1>
        <QuickAddTransaction coupleId={couple.coupleId} userId={user!.id} accounts={accounts} categories={categories} members={couple.members} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { href: "/finance/transactions", label: "Transações" },
          { href: "/finance/recurring", label: "Recorrências" },
          { href: "/finance/installments", label: "Parcelamentos" },
          { href: "/finance/budgets", label: "Orçamentos" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between pt-5">
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountsManager coupleId={couple.coupleId} userId={user!.id} accounts={accounts} transactions={allTx.transactions} members={couple.members} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactionsList coupleId={couple.coupleId} userId={user!.id} transactions={recent} accounts={accounts} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
