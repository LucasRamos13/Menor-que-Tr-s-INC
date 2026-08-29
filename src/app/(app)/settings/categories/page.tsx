import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listCategories } from "@/services/finance/categories-service";
import { CategoriesManager } from "./categories-manager";

export default async function CategoriesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const categories = await listCategories(supabase, couple.coupleId);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Categorias</h1>
      <CategoriesManager coupleId={couple.coupleId} categories={categories} />
    </div>
  );
}
