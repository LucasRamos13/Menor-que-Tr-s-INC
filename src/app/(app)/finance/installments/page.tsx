import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listAccounts } from "@/services/finance/accounts-service";
import { listCategories } from "@/services/finance/categories-service";
import { listInstallmentPlans } from "@/services/finance/installments-service";
import { InstallmentsManager } from "./installments-manager";

export default async function InstallmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const [accounts, categories, plans] = await Promise.all([
    listAccounts(supabase, couple.coupleId),
    listCategories(supabase, couple.coupleId),
    listInstallmentPlans(supabase, couple.coupleId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Parcelamentos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Compras parceladas geram todas as parcelas futuras automaticamente.</p>
      </div>
      <InstallmentsManager coupleId={couple.coupleId} userId={user!.id} accounts={accounts} categories={categories} plans={plans} />
    </div>
  );
}
