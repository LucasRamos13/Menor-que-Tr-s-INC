import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCoupleContext(supabase, user.id);
  if (couple) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 dark:from-slate-950 dark:to-slate-900">
      <OnboardingForm userName={user.user_metadata?.full_name ?? user.email ?? ""} />
    </main>
  );
}
