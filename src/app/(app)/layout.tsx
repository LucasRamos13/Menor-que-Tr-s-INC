import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { generateDueRecurringTransactions } from "@/services/finance/recurring-service";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCoupleContext(supabase, user.id);
  if (!couple) redirect("/onboarding");

  // Cheap, idempotent — see generateDueRecurringTransactions for why this
  // stands in for a cron job without needing one.
  generateDueRecurringTransactions(supabase, couple.coupleId, user.id).catch((err) =>
    console.error("[recurring-transactions] failed to generate due transactions", err),
  );

  const me = {
    id: user.id,
    fullName: user.user_metadata?.full_name ?? user.email ?? "",
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    email: user.email ?? "",
  };

  return (
    <AppShell couple={couple} me={me}>
      {children}
    </AppShell>
  );
}
