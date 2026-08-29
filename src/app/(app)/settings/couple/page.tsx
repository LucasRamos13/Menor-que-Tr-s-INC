import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { CoupleSettingsForm } from "./couple-settings-form";

export default async function CoupleSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Casal e convites</h1>
      <CoupleSettingsForm couple={couple} userId={user!.id} />
    </div>
  );
}
